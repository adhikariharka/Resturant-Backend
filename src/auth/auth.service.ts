import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
    private googleClient: OAuth2Client;

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('GOOGLE_CLIENT_ID') ?? "",
        );
    }

    async verifyGoogleToken(token: string) {
        try {
            // 1. Try to verify as ID Token (JWT)
            const ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: this.configService.get<string>('GOOGLE_CLIENT_ID') ?? "",
            });
            return ticket.getPayload();
        } catch (error) {
            try {
                // 2. If ID Token failed, try to use Access Token to fetch User Info
                // We need to fetch the profile from the Google UserInfo endpoint
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!userInfoResponse.ok) {
                    throw new Error('Failed to fetch user info');
                }

                const userInfo = await userInfoResponse.json() as any;

                return {
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture,
                    sub: userInfo.sub,
                    email_verified: userInfo.email_verified,
                };
            } catch (innerError) {
                console.error("Token verification failed:", innerError);
                throw new UnauthorizedException('Invalid Google Token');
            }
        }
    }

    async loginGoogle(token: string) {

        try {

            console.log(token);
            const payload = await this.verifyGoogleToken(token);

            console.log(payload);
            if (!payload) throw new UnauthorizedException('Invalid Token Payload');

            const email = payload.email;

            if (!email) {
                throw new UnauthorizedException('Google token does not contain email');
            }

            let user = await this.usersService.findByEmail(email);

            if (!user) {
                // Create user if not exists
                const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                try {
                    const [newUser] = await this.usersService.create({
                        email,
                        name: (payload as any).name || 'Google User',
                        password: randomPassword,
                        role: 'customer',
                    });
                    user = newUser;
                } catch (error) {
                    // If create failed (race condition), try finding again
                    user = await this.usersService.findByEmail(email);
                    if (!user) throw error;
                }
            }

            // Generate tokens
            const tokenId = crypto.randomUUID();
            const tokens = await this.getTokens(user.id, user.email, user.role, tokenId);
            await this.addRefreshToken(tokenId, user.id, tokens.refreshToken);

            console.log(tokens);

            return {
                user,
                backendTokens: tokens,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }


    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async register(createUserDto: CreateUserDto) {
        const existing = await this.usersService.findByEmail(createUserDto.email);
        if (existing) {
            throw new UnauthorizedException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        return this.usersService.create({
            ...createUserDto,
            password: hashedPassword,
        });
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokenId = crypto.randomUUID();
        const tokens = await this.getTokens(user.id, user.email, user.role, tokenId);
        await this.addRefreshToken(tokenId, user.id, tokens.refreshToken);
        return {
            user,
            backendTokens: tokens,
        };
    }

    async whoami(userId: string) {
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        const { password, ...result } = user;
        return result;
    }

    async logout(userId: string, tokenId?: string) {
        if (tokenId) {
            // Logout from single device
            return this.usersService.removeRefreshTokenById(tokenId);
        }
        // Logout from all devices
        return this.usersService.removeAllRefreshTokens(userId);
    }

    async getActiveSessions(userId: string) {
        const sessions = await this.usersService.getActiveSessions(userId);
        return {
            count: sessions.length,
            sessions: sessions.map((s: any) => ({
                id: s.id,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
            })),
        };
    }

    async refresh(refreshToken: string) {
        let payload: any;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch (e) {
            throw new ForbiddenException('Access Denied');
        }

        const userId = payload.sub;
        const tokenId = payload.jti;
        if (!tokenId || !userId) throw new ForbiddenException('Access Denied details missing');

        const savedToken = await this.usersService.findRefreshToken(tokenId);
        if (!savedToken) {
            throw new ForbiddenException('Access Denied');
        }

        const refreshTokenMatches = await bcrypt.compare(refreshToken, savedToken.token);
        if (!refreshTokenMatches) {
            throw new ForbiddenException('Access Denied');
        }

        // Rotate
        await this.usersService.removeRefreshToken(tokenId);

        const newTokenId = crypto.randomUUID();
        const tokens = await this.getTokens(userId, payload.email, payload.role, newTokenId);
        await this.addRefreshToken(newTokenId, userId, tokens.refreshToken);

        return tokens;
    }

    async addRefreshToken(id: string, userId: string, refreshToken: string) {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.usersService.addRefreshToken(id, userId, hashedRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    }

    async getTokens(userId: string, email: string, role: string, tokenId: string) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                {
                    sub: userId,
                    email,
                    role,
                },
                {
                    secret: this.configService.get<string>('JWT_SECRET'),
                    expiresIn: '15m',
                },
            ),
            this.jwtService.signAsync(
                {
                    sub: userId,
                    email,
                    role,
                    jti: tokenId,
                },
                {
                    secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                    expiresIn: '7d',
                },
            ),
        ]);

        return {
            accessToken,
            refreshToken,
            expiresIn: new Date().setTime(new Date().getTime() + 15 * 60 * 1000), // 15m
        };
    }

    async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return { message: 'If email exists, reset link sent' };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        await this.usersService.setResetToken(email, resetToken, expiry);

        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: this.configService.get<string>('MAIL_USER'),
                    pass: this.configService.get<string>('MAIL_PASS'),
                },
            });

            await transporter.sendMail({
                from: '"Support Team" <' + this.configService.get<string>('MAIL_USER') + '>',
                to: email,
                subject: 'Password Reset Request',
                html: `
                    <h3>Password Reset</h3>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <p><a href="${resetLink}">Reset Password</a></p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p>${resetLink}</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <p>Link expires in 1 hour.</p>
                `,
            });
        } catch (error) {
            console.error('Email sending failed:', error);
            // Don't throw to user, just log
        }

        return { message: 'Reset link sent' };
    }

    async resetPassword(token: string, newPass: string) {
        const user = await this.usersService.findByResetToken(token);
        if (!user) {
            throw new UnauthorizedException('Invalid Token');
        }

        if (new Date() > new Date(user.resetTokenExpiry)) {
            throw new UnauthorizedException('Token Expired');
        }

        const hashedPassword = await bcrypt.hash(newPass, 10);
        await this.usersService.updatePasswordByEmail(user.email, hashedPassword);

        return { message: 'Password updated successfully' };
    }
}
