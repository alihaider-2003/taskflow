INSERT INTO users (id, name, email, password_hash)
VALUES
    (1, 'Other User', 'other@taskflow.local', '$2b$12$6vcIbJfRG3vItzYQK2Dkcen/Q83u7jFK3Q/A51n2k.YdF0Lab6uD.'),
    (2, 'Test User', 'test@taskflow.local', '$2b$12$6vcIbJfRG3vItzYQK2Dkcen/Q83u7jFK3Q/A51n2k.YdF0Lab6uD.');

INSERT INTO projects (id, user_id, name, description)
VALUES
    (1, 1, 'DevOps Production Project', 'Production-ready TaskFlow platform'),
    (3, 2, 'JWT Protected Project', 'Created from authenticated user');

SELECT setval('users_id_seq', 2, true);
SELECT setval('projects_id_seq', 3, true);
