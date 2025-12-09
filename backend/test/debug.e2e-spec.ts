import { Test } from '@nestjs/testing';
import { AuthModule } from '../src/auth/auth.module';

describe('Debug', () => {
    it('should compile AuthModule', async () => {
        try {
            const module = await Test.createTestingModule({
                imports: [AuthModule],
            }).compile();
            expect(module).toBeDefined();
        } catch (e) {
            console.error('Compilation Error:', e);
            throw e;
        }
    });
});
