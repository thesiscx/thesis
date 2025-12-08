-- Add status column to investors table
ALTER TABLE public.investors ADD COLUMN status text DEFAULT 'prospect';

-- Add comment documenting the status flow
COMMENT ON COLUMN public.investors.status IS 'Status flow: prospect (after meeting) -> pitch (memo accessed) -> contract (docket accessed) -> won (signed+funded) / lost (expired/archived/inactive)';