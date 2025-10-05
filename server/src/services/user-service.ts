import { query } from '@/db';
import { Roles, type Role } from '@/utils/constants';

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const result = await query<User>('SELECT * FROM users WHERE email = $1', [normalizeEmail(email)]);
  return result.rows[0];
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

export const createUser = async (user: {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role?: Role;
}): Promise<User> => {
  const now = new Date().toISOString();
  const result = await query<User>(
    `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user.id,
      normalizeEmail(user.email),
      user.passwordHash,
      user.fullName,
      user.role ?? Roles.User,
      now,
      now,
    ],
  );
  return result.rows[0];
};

export const listAgentsAndAdmins = async (): Promise<User[]> => {
  const result = await query<User>(
    `SELECT * FROM users WHERE role = ANY($1) ORDER BY full_name ASC`,
    [[Roles.Agent, Roles.Admin]],
  );
  return result.rows;
};

export const updateUserRole = async (id: string, role: Role): Promise<User | undefined> => {
  const now = new Date().toISOString();
  const result = await query<User>(
    `UPDATE users SET role = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
    [role, now, id],
  );
  return result.rows[0];
};
