/*
  Migration: 002-unique-email.sql
  Ensures `Users.email` is unique by resolving duplicates and adding a unique constraint.
  - Idempotent: will not re-run if constraint already exists.
  - Duplicate resolution: for duplicated non-empty emails, keeps the lowest id row unchanged and appends 
    a suffix "+<id>" to other rows to make emails unique (traceable and deterministic).
*/
SET NOCOUNT ON;

BEGIN TRANSACTION;
BEGIN TRY

  -- Only proceed if Users table has an email column
  IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = N'email' AND Object_ID = OBJECT_ID(N'dbo.Users')
  )
  BEGIN
    PRINT 'Users.email column not present; skipping unique-email migration.';
    ROLLBACK TRANSACTION;
    RETURN;
  END;

  -- If unique constraint already exists, nothing to do
  IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Users_Email')
  BEGIN
    PRINT 'Unique constraint UQ_Users_Email already exists; skipping.';
    COMMIT TRANSACTION;
    RETURN;
  END;

  -- Normalize and detect duplicates (non-empty emails)
  ;WITH OrderedEmails AS (
    SELECT
      id,
      email,
      LOWER(LTRIM(RTRIM(email))) AS norm_email,
      ROW_NUMBER() OVER (PARTITION BY LOWER(LTRIM(RTRIM(email))) ORDER BY id) AS rn
    FROM dbo.Users
    WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''
  )
  -- Make duplicate emails unique by appending +<id> to all but the first occurrence
  UPDATE u
  SET email = oe.email + '+' + CAST(u.id AS NVARCHAR(20))
  FROM dbo.Users u
  JOIN OrderedEmails oe ON u.id = oe.id
  WHERE oe.rn > 1;

  -- Create unique constraint on email
  ALTER TABLE dbo.Users
  ADD CONSTRAINT UQ_Users_Email UNIQUE (email);

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  ROLLBACK TRANSACTION;
  DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
  RAISERROR('Migration 002-unique-email failed: %s', 16, 1, @ErrMsg);
END CATCH;
