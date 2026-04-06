-- Migration 002: rename email → mobile on users table
ALTER TABLE users RENAME COLUMN email TO mobile;
