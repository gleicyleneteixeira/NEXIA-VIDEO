create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  question_text text not null,
  alternatives jsonb not null,
  correct_answer integer not null,
  explanation text,
  difficulty text default 'medium',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable row level security
alter table public.questions enable row level security;

-- Create policy for authenticated users to read questions
create policy "Allow authenticated users to read questions" on public.questions
for select using (true);

-- Create trigger for updated_at
create trigger set questions_updated_at
before update on public.questions
for each row
execute function handle_updated_at();