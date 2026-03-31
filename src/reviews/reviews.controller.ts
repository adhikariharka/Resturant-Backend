import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { reviews } from '../drizzle/schema';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Post()
    create(@Body() data: typeof reviews.$inferInsert) {
        return this.reviewsService.create(data);
    }

    @Get()
    findAll() {
        return this.reviewsService.findAll();
    }
}
