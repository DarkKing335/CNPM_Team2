-- RBAC Schema for SQL Server

IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID('dbo.Customers', 'U') IS NOT NULL DROP TABLE dbo.Customers;
IF OBJECT_ID('dbo.UserRoles', 'U') IS NOT NULL DROP TABLE dbo.UserRoles;
IF OBJECT_ID('dbo.RolePermissions', 'U') IS NOT NULL DROP TABLE dbo.RolePermissions;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
IF OBJECT_ID('dbo.Permissions', 'U') IS NOT NULL DROP TABLE dbo.Permissions;
GO

CREATE TABLE Roles (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name_role NVARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE Permissions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name_permission NVARCHAR(50) NOT NULL,
  module NVARCHAR(50) NOT NULL,
  CONSTRAINT UQ_Permission UNIQUE (name_permission, module)
);
GO

CREATE TABLE RolePermissions (
  id_role INT NOT NULL,
  id_permission INT NOT NULL,
  PRIMARY KEY (id_role, id_permission),
  FOREIGN KEY (id_role) REFERENCES Roles(id) ON DELETE CASCADE,
  FOREIGN KEY (id_permission) REFERENCES Permissions(id) ON DELETE CASCADE
);
GO

CREATE TABLE Users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(100) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL
);
GO

CREATE TABLE UserRoles (
  id_user INT NOT NULL,
  id_role INT NOT NULL,
  PRIMARY KEY (id_user, id_role),
  FOREIGN KEY (id_user) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_role) REFERENCES Roles(id) ON DELETE CASCADE
);
GO

-- Seed roles
INSERT INTO Roles (name_role) VALUES ('Admin'), ('Manager'), ('Staff'), ('Customer');
GO

-- Seed permissions for Order module
INSERT INTO Permissions (name_permission, module) VALUES
 ('View','Order'), ('Edit','Order'), ('Add','Order'), ('Delete','Order');
GO

-- Seed permissions for Customer module
INSERT INTO Permissions (name_permission, module) VALUES
 ('View','Customer'), ('Edit','Customer'), ('Add','Customer'), ('Delete','Customer');
GO

-- Create demo users (password = Password123!) hashed later; placeholders for now
INSERT INTO Users (username, password_hash) VALUES
 ('admin', 'PLACEHOLDER'),
 ('manager', 'PLACEHOLDER'),
 ('staff', 'PLACEHOLDER'),
 ('customer', 'PLACEHOLDER');
GO

-- Assign roles
INSERT INTO UserRoles (id_user, id_role)
SELECT u.id, r.id FROM Users u JOIN Roles r ON (
 (u.username='admin' AND r.name_role='Admin') OR
 (u.username='manager' AND r.name_role='Manager') OR
 (u.username='staff' AND r.name_role='Staff') OR
 (u.username='customer' AND r.name_role='Customer')
);
GO

-- Create Orders table
CREATE TABLE Orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  item NVARCHAR(500) NOT NULL,
  customer_name NVARCHAR(100) NOT NULL,
  customer_phone NVARCHAR(20) NULL,
  customer_email NVARCHAR(100) NULL,
  customer_address NVARCHAR(255) NULL,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  created_by INT NULL,
  FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
);
GO

-- Create Customers table
CREATE TABLE Customers (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  phone NVARCHAR(20) NULL,
  email NVARCHAR(100) NULL,
  address NVARCHAR(255) NULL,
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  created_by INT NULL,
  FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
);
GO

-- Seed role-permissions
-- Admin: all
INSERT INTO RolePermissions (id_role, id_permission)
SELECT r.id, p.id FROM Roles r CROSS JOIN Permissions p WHERE r.name_role='Admin';
GO
-- Manager: View, Edit, Add
INSERT INTO RolePermissions (id_role, id_permission)
SELECT r.id, p.id FROM Roles r JOIN Permissions p ON r.name_role='Manager' AND p.name_permission IN ('View','Edit','Add');
GO
-- Staff: View, Add
INSERT INTO RolePermissions (id_role, id_permission)
SELECT r.id, p.id FROM Roles r JOIN Permissions p ON r.name_role='Staff' AND p.name_permission IN ('View','Add');
GO
-- Customer: View
INSERT INTO RolePermissions (id_role, id_permission)
SELECT r.id, p.id FROM Roles r JOIN Permissions p ON r.name_role='Customer' AND p.name_permission IN ('View');
GO

-- Seed sample orders (after users are created)
INSERT INTO Orders (item, customer_name, customer_phone, customer_email, customer_address, created_at, updated_at, created_by) VALUES
  ('Sample Order 1 - Test Product A', 'Alice Nguyen', '0901-234-567', 'alice@example.com', '123 Le Loi, District 1, HCMC', DATEADD(day, -5, GETDATE()), DATEADD(day, -5, GETDATE()), 1),
  ('Sample Order 2 - Test Product B', 'Bao Tran', '0902-345-678', 'bao.tran@example.com', '456 Tran Hung Dao, District 5, HCMC', DATEADD(day, -3, GETDATE()), DATEADD(day, -3, GETDATE()), 1),
  ('Sample Order 3 - Test Product C', 'Chi Pham', '0903-456-789', 'chi.pham@example.com', '789 Nguyen Hue, District 1, HCMC', DATEADD(day, -1, GETDATE()), DATEADD(day, -1, GETDATE()), 2);
GO

-- Seed sample customers
INSERT INTO Customers (name, phone, email, address, created_at, updated_at, created_by) VALUES
 ('Duc Le', '0904-111-222', 'duc.le@example.com', '12 Hai Ba Trung, HCMC', GETDATE(), GETDATE(), 1),
 ('Huong Vo', '0905-333-444', 'huong.vo@example.com', '34 Pasteur, HCMC', GETDATE(), GETDATE(), 1),
 ('Minh Phan', '0906-555-666', 'minh.phan@example.com', '56 Dien Bien Phu, HCMC', GETDATE(), GETDATE(), 2);
GO
