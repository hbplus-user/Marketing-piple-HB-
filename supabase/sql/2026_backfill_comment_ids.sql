-- Backfills an `id` onto every comment stored in content_requests.data->rounds->comments
-- that doesn't already have one. Needed because Edit/Delete on a comment (added in this
-- app version) can only target a comment that has a stable id — comments created before
-- that change have none, so without this they're stuck read-only forever.
--
-- Safe to run more than once: only touches comments missing an id, leaves everything
-- else (existing ids, text, timestamps, kind, etc.) untouched.

-- Optional: see how many rows/comments are affected before running the backfill below.
-- select
--   id,
--   (
--     select count(*)
--     from jsonb_array_elements(data->'rounds') as r,
--          jsonb_array_elements(r->'comments') as c
--     where not (c ? 'id')
--   ) as comments_missing_id
-- from content_requests
-- having (
--   select count(*)
--   from jsonb_array_elements(data->'rounds') as r,
--        jsonb_array_elements(r->'comments') as c
--   where not (c ? 'id')
-- ) > 0
-- group by id, data;

do $$
declare
  req record;
  rnd jsonb;
  cmt jsonb;
  new_rounds jsonb;
  new_comments jsonb;
begin
  for req in select id, data from content_requests loop
    new_rounds := '[]'::jsonb;

    for rnd in select * from jsonb_array_elements(coalesce(req.data->'rounds', '[]'::jsonb)) loop
      new_comments := '[]'::jsonb;

      for cmt in select * from jsonb_array_elements(coalesce(rnd->'comments', '[]'::jsonb)) loop
        if not (cmt ? 'id') then
          cmt := cmt || jsonb_build_object('id', 'comment-' || replace(gen_random_uuid()::text, '-', ''));
        end if;
        new_comments := new_comments || jsonb_build_array(cmt);
      end loop;

      new_rounds := new_rounds || jsonb_build_array(jsonb_set(rnd, '{comments}', new_comments));
    end loop;

    update content_requests
    set data = jsonb_set(req.data, '{rounds}', new_rounds)
    where id = req.id;
  end loop;
end $$;
