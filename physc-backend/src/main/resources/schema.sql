CREATE DATABASE IF NOT EXISTS physc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE physc_db;

CREATE TABLE IF NOT EXISTS users (
     id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(50) NOT NULL UNIQUE,
     email VARCHAR(255) NOT NULL UNIQUE,
     password VARCHAR(255) NOT NULL,
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     FULLTEXT INDEX ft_users_search (username)
);

CREATE TABLE IF NOT EXISTS machines (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    forked_from_id BIGINT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    machine_data JSON NOT NULL,
    thumbnail TEXT NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_machines_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_machines_forked_from FOREIGN KEY (forked_from_id) REFERENCES machines(id) ON DELETE SET NULL,
    FULLTEXT INDEX ft_machines_search (name, description)
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

CREATE INDEX idx_machines_user_id ON machines (user_id);
CREATE INDEX idx_machines_is_public ON machines (is_public);
CREATE INDEX idx_machines_updated ON machines (updated_at);
CREATE INDEX idx_machines_forked_from ON machines (forked_from_id);
