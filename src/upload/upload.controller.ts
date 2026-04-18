import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'staff')
@Controller('upload')
export class UploadController {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    @Post()
    @ApiOperation({ summary: 'Upload an image to Cloudinary (admin or staff)' })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: new CloudinaryStorage({
                cloudinary: cloudinary,
                params: {
                    folder: 'restaurant-menu',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'tiff', 'ico'],
                    public_id: (req: any, file: any) => {
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                        return `${file.fieldname}-${uniqueSuffix}`;
                    },
                } as any,
            }),
        }),
    )
    uploadFile(@UploadedFile() file: any) {
        return {
            url: file.path,
            filename: file.filename,
        };
    }
}
