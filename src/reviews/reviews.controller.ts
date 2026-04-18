import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { reviews } from '../drizzle/schema';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post()
    @ApiOperation({ summary: 'Leave a review for an order you placed' })
    async create(
        @Body() data: Omit<typeof reviews.$inferInsert, 'userId'>,
        @Request() req: any,
    ) {
        if (!data.orderId) throw new BadRequestException('orderId is required.');
        if (data.rating < 1 || data.rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5.');
        }
        return this.reviewsService.create({ ...data, userId: req.user.userId });
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles('admin')
    @ApiOperation({ summary: 'List all reviews (admin)' })
    findAll() {
        return this.reviewsService.findAll();
    }
}
