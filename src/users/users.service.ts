import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import { users, refreshTokens } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
    constructor(@Inject(DRIZZLE) private db: any) { }

    // Used internally by auth.service.register() + loginGoogle().
    async create(createUserDto: CreateUserDto) {
        return this.db.insert(users).values(createUserDto).returning();
    }

    // Used internally by whoami().
    async findOne(id: string) {
        return this.db.query.users.findFirst({
            where: eq(users.id, id),
        });
    }

    async findByEmail(email: string) {
        return this.db.query.users.findFirst({
            where: eq(users.email, email),
        });
    }

    async findByResetToken(token: string) {
        return this.db.query.users.findFirst({
            where: eq(users.resetToken, token),
        });
    }

    async update(id: string, updateUserDto: Partial<CreateUserDto>) {
        const [updatedUser] = await this.db.update(users)
            .set(updateUserDto)
            .where(eq(users.id, id))
            .returning();
        return updatedUser;
    }

    async addRefreshToken(id: string, userId: string, token: string, expiresAt: Date) {
        const [entry] = await this.db.insert(refreshTokens).values({
            id,
            userId,
            token,
            expiresAt,
        }).returning();
        return entry;
    }

    async findRefreshToken(id: string) {
        return this.db.query.refreshTokens.findFirst({
            where: eq(refreshTokens.id, id)
        });
    }

    async removeRefreshToken(id: string) {
        return this.db.delete(refreshTokens).where(eq(refreshTokens.id, id));
    }

    async removeAllRefreshTokens(userId: string) {
        return this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    }

    async getActiveSessions(userId: string) {
        return this.db.query.refreshTokens.findMany({
            where: eq(refreshTokens.userId, userId),
            orderBy: [desc(refreshTokens.createdAt)],
        });
    }

    async getActiveSessionCount(userId: string) {
        const sessions = await this.getActiveSessions(userId);
        return sessions.length;
    }

    async removeRefreshTokenById(tokenId: string) {
        return this.db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
    }

    async setResetToken(email: string, token: string, expiry: Date) {
        return this.db.update(users)
            .set({ resetToken: token, resetTokenExpiry: expiry })
            .where(eq(users.email, email));
    }

    async updatePasswordByEmail(email: string, password: string) {
        return this.db.update(users)
            .set({ password, resetToken: null, resetTokenExpiry: null }) // Clear token after use
            .where(eq(users.email, email));
    }
}
