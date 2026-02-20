-- UniBridge migration: add contact fields for opportunities
-- Run this once in Supabase SQL editor for existing projects.

alter table if exists public.opportunities
  add column if not exists contact_person text default '',
  add column if not exists contact_link text default '';
