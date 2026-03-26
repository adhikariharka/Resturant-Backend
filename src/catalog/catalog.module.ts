import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { FoodService } from './food.service';
import { FoodController } from './food.controller';

@Module({
    controllers: [CategoriesController, FoodController],
    providers: [CategoriesService, FoodService],
})
export class CatalogModule { }
