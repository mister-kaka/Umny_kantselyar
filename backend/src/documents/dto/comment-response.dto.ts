export class CommentResponseDto {
    id!: number;
    documentId!: number;
    userId!: number;
    userName!: string;
    text!: string;
    createdAt!: Date;
}