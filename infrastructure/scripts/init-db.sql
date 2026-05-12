CREATE DATABASE vertex_test_db
  WITH OWNER = vertex_user ENCODING = 'UTF8' TEMPLATE = template0;
GRANT ALL PRIVILEGES ON DATABASE vertex_test_db TO vertex_user;
ALTER USER vertex_user SET search_path TO public;
