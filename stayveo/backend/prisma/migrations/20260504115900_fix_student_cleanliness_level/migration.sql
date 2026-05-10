ALTER TABLE "student_profiles"
ALTER COLUMN "cleanliness_level" TYPE INTEGER
USING CASE
  WHEN "cleanliness_level" ~ '^[0-9]+$' THEN "cleanliness_level"::INTEGER
  ELSE NULL
END;
