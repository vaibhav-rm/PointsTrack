DO $$ 
DECLARE
  curr_deltype "char";
BEGIN
  -- Check existing foreign key constraint definition on points_ledger
  SELECT c.confdeltype INTO curr_deltype
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'points_ledger' 
    AND c.conname = 'points_ledger_student_id_students_id_fk';

  IF FOUND THEN
    IF curr_deltype = 'r' THEN
      -- Already ON DELETE RESTRICT: Do nothing (No drop, no lock window)
      RAISE NOTICE 'Constraint points_ledger_student_id_students_id_fk is already ON DELETE RESTRICT.';
      RETURN;
    ELSE
      -- Drop legacy non-restrict constraint
      ALTER TABLE "points_ledger" DROP CONSTRAINT "points_ledger_student_id_students_id_fk";
    END IF;
  END IF;

  -- Add constraint with ON DELETE RESTRICT
  ALTER TABLE "points_ledger"
    ADD CONSTRAINT "points_ledger_student_id_students_id_fk"
    FOREIGN KEY ("student_id")
    REFERENCES "public"."students"("id")
    ON DELETE restrict
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
