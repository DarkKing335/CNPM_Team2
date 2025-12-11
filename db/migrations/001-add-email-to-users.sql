/*
  Migration: 001-add-email-to-users.sql
  Adds `email` column to `Users` table (if missing) and updates seed rows
  This script is idempotent and safe to run multiple times.
*/
SET NOCOUNT ON;

BEGIN TRANSACTION;
BEGIN TRY

  -- Add column if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = N'email' AND Object_ID = OBJECT_ID(N'dbo.Users')
  )
  BEGIN
    ALTER TABLE dbo.Users ADD email NVARCHAR(100) NULL;
  END;

  -- Update seeded placeholder users to have example emails if empty
  UPDATE dbo.Users
  SET email = CASE
    WHEN username = 'admin' THEN 'admin@ued.com'
    WHEN username = 'manager' THEN 'manager@ued.com'
    WHEN username = 'staff' THEN 'staff@ued.com'
    WHEN username = 'customer' THEN 'customer@ued.com'
    ELSE email
  END
  WHERE email IS NULL OR LTRIM(RTRIM(email)) = '';

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  ROLLBACK TRANSACTION;
  DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
  RAISERROR('Migration 001-add-email-to-users failed: %s', 16, 1, @ErrMsg);
END CATCH;
