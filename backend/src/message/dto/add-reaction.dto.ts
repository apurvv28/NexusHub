import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class AddReactionDto {
  @IsUUID()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  emojiCode!: string;
}
