import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module';
import { addresses } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
    constructor(@Inject(DRIZZLE) private db: any) { }

    async create(createAddressDto: CreateAddressDto) {
        if (createAddressDto.isDefault) {
            await this.db.update(addresses)
                .set({ isDefault: false })
                .where(eq(addresses.userId, createAddressDto.userId));
        }
        return this.db.insert(addresses).values(createAddressDto).returning();
    }

    async findAllByUserId(userId: string) {
        return this.db.query.addresses.findMany({
            where: eq(addresses.userId, userId),
        });
    }

    async findOne(id: string) {
        return this.db.query.addresses.findFirst({
            where: eq(addresses.id, id),
        });
    }

    async update(id: string, updateAddressDto: UpdateAddressDto) {
        if (updateAddressDto.isDefault) {
            const address = await this.findOne(id);
            if (address) {
                await this.db.update(addresses)
                    .set({ isDefault: false })
                    .where(eq(addresses.userId, address.userId));
            }
        }

        return this.db.update(addresses)
            .set(updateAddressDto)
            .where(eq(addresses.id, id))
            .returning();
    }

    async remove(id: string) {
        return this.db.delete(addresses)
            .where(eq(addresses.id, id))
            .returning();
    }
}
