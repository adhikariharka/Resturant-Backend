import { Test, TestingModule } from '@nestjs/testing';
import { HoursController } from './hours.controller';

describe('HoursController', () => {
  let controller: HoursController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HoursController],
    }).compile();

    controller = module.get<HoursController>(HoursController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
