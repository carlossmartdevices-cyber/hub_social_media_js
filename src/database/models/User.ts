export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  isActive?: boolean;
}
