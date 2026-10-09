export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface UserSnapshot {
  id: string;
  email: string;
  name: string;
}

export interface UserWithPassword extends UserSnapshot {
  password: string;
}

export interface UsersRepository {
  create(input: CreateUserInput): Promise<UserSnapshot>;
  findById(id: string): Promise<UserSnapshot | null>;
  findByEmail(email: string): Promise<UserSnapshot | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
}
