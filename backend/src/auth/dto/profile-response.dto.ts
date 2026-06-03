import { Expose } from 'class-transformer';

export class ProfileResponseDto {
    @Expose()
    id!: number;

    @Expose()
    fullName!: string;

    @Expose()
    email!: string;

    @Expose()
    role!: string;

    @Expose()
    department!: string | null;

    @Expose()
    avatarUrl!: string | null;

    @Expose()
    createdAt!: Date;
}