import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'Return JWT tokens' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    @ApiOperation({ summary: 'Register new user' })
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @Post('google')
    @ApiOperation({ summary: 'Login with Google' })
    async googleLogin(@Body() body: { token: string }) {
        return this.authService.loginGoogle(body.token);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('whoami')
    @ApiOperation({ summary: 'Get current user profile' })
    async whoami(@Request() req: any) {
        return this.authService.whoami(req.user.userId);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token' })
    async refresh(@Body() body: { refreshToken: string }) {
        return this.authService.refresh(body.refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('sessions')
    @ApiOperation({ summary: 'Get active sessions' })
    async getSessions(@Request() req: any) {
        return this.authService.getActiveSessions(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post('logout')
    @ApiOperation({ summary: 'Logout from current or specific device' })
    async logout(@Request() req: any, @Body() body: { tokenId?: string }) {
        return this.authService.logout(req.user.userId, body.tokenId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post('logout-all')
    @ApiOperation({ summary: 'Logout from all devices' })
    async logoutAll(@Request() req: any) {
        return this.authService.logout(req.user.userId);
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Request password reset' })
    async forgotPassword(@Body() body: { email: string }) {
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with token' })
    async resetPassword(@Body() body: { token: string; newPass: string }) {
        return this.authService.resetPassword(body.token, body.newPass);
    }
}
