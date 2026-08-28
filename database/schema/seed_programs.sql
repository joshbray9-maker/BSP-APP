-- Repopulates the 4 real programs (org/team/roster structure only — no fake session/result
-- numbers) immediately after schema_sketch.sql is applied to a fresh Supabase project. Run this
-- right after schema_sketch.sql, in the same SQL Editor session, so the live dashboard isn't
-- empty the moment Josh signs in. Athlete names are intentionally synthetic placeholders,
-- matching src/data/mockData.js's PROGRAM_* arrays and CLAUDE.md's data-privacy rule — org/team
-- names, logos, and colors are real; rosters are not, until Josh sends real ones.
--
-- Deliberately excludes src/data/mockData.js's DEMO_* orgs (Org Alpha/Org Beta) — those are
-- local-only testing scaffolding, not something that belongs in a real client's production data.
-- Also excludes test_sessions/test_results entirely — synthetic performance numbers have no
-- place in a live coaching dashboard; real data comes in via upload, manual entry, or VALD sync.

insert into organizations (name, logo_url, color_primary, color_accent) values
  ('Bishop''s College School', '/logos/bcs-bears.jpeg', '#631d76', '#631d76'),
  ('Académie Universel', '/logos/universel-academie.jpg', '#249346', '#249346'),
  ('Bishop''s University', '/logos/bishops-university-rugby.jpg', '#753bb0', '#753bb0'),
  ('Iona University', '/logos/iona-gaels.jpg', '#661e2b', '#661e2b');

insert into teams (org_id, name, sport) values
  ((select id from organizations where name = 'Bishop''s College School'), 'BCS Bears Varsity (U18 Hockey)', 'Hockey'),
  ((select id from organizations where name = 'Bishop''s College School'), 'BCS Bears Prep (U16 Hockey)', 'Hockey'),
  ((select id from organizations where name = 'Bishop''s College School'), 'BCS Basketball Varsity', 'Basketball'),
  ((select id from organizations where name = 'Bishop''s College School'), 'BCS Basketball Prep', 'Basketball'),
  ((select id from organizations where name = 'Académie Universel'), 'Universel NCDC Vermont', 'Hockey'),
  ((select id from organizations where name = 'Académie Universel'), 'Universel NCDC Quebec', 'Hockey'),
  ((select id from organizations where name = 'Académie Universel'), 'Universel USPHL', 'Hockey'),
  ((select id from organizations where name = 'Académie Universel'), 'Universel Varsity', 'Hockey'),
  ((select id from organizations where name = 'Bishop''s University'), 'BU Men''s Rugby', 'Rugby'),
  ((select id from organizations where name = 'Iona University'), 'Iona Men''s Rugby', 'Rugby');

insert into athletes (team_id, display_name, position) values
  ((select id from teams where name = 'BCS Bears Varsity (U18 Hockey)'), 'Athlete HV01', 'Forward'),
  ((select id from teams where name = 'BCS Bears Varsity (U18 Hockey)'), 'Athlete HV02', 'Defense'),
  ((select id from teams where name = 'BCS Bears Varsity (U18 Hockey)'), 'Athlete HV03', 'Goalie'),
  ((select id from teams where name = 'BCS Bears Varsity (U18 Hockey)'), 'Athlete HV04', 'Forward'),

  ((select id from teams where name = 'BCS Bears Prep (U16 Hockey)'), 'Athlete HP01', 'Forward'),
  ((select id from teams where name = 'BCS Bears Prep (U16 Hockey)'), 'Athlete HP02', 'Defense'),
  ((select id from teams where name = 'BCS Bears Prep (U16 Hockey)'), 'Athlete HP03', 'Goalie'),
  ((select id from teams where name = 'BCS Bears Prep (U16 Hockey)'), 'Athlete HP04', 'Defense'),

  ((select id from teams where name = 'BCS Basketball Varsity'), 'Athlete KV01', 'Guard'),
  ((select id from teams where name = 'BCS Basketball Varsity'), 'Athlete KV02', 'Forward'),
  ((select id from teams where name = 'BCS Basketball Varsity'), 'Athlete KV03', 'Center'),
  ((select id from teams where name = 'BCS Basketball Varsity'), 'Athlete KV04', 'Guard'),

  ((select id from teams where name = 'BCS Basketball Prep'), 'Athlete KP01', 'Guard'),
  ((select id from teams where name = 'BCS Basketball Prep'), 'Athlete KP02', 'Forward'),
  ((select id from teams where name = 'BCS Basketball Prep'), 'Athlete KP03', 'Center'),
  ((select id from teams where name = 'BCS Basketball Prep'), 'Athlete KP04', 'Forward'),

  ((select id from teams where name = 'Universel NCDC Vermont'), 'Athlete UV01', 'Forward'),
  ((select id from teams where name = 'Universel NCDC Vermont'), 'Athlete UV02', 'Defense'),
  ((select id from teams where name = 'Universel NCDC Vermont'), 'Athlete UV03', 'Goalie'),
  ((select id from teams where name = 'Universel NCDC Vermont'), 'Athlete UV04', 'Forward'),

  ((select id from teams where name = 'Universel NCDC Quebec'), 'Athlete UQ01', 'Forward'),
  ((select id from teams where name = 'Universel NCDC Quebec'), 'Athlete UQ02', 'Defense'),
  ((select id from teams where name = 'Universel NCDC Quebec'), 'Athlete UQ03', 'Goalie'),
  ((select id from teams where name = 'Universel NCDC Quebec'), 'Athlete UQ04', 'Defense'),

  ((select id from teams where name = 'Universel USPHL'), 'Athlete UU01', 'Forward'),
  ((select id from teams where name = 'Universel USPHL'), 'Athlete UU02', 'Defense'),
  ((select id from teams where name = 'Universel USPHL'), 'Athlete UU03', 'Goalie'),
  ((select id from teams where name = 'Universel USPHL'), 'Athlete UU04', 'Forward'),

  ((select id from teams where name = 'Universel Varsity'), 'Athlete UT01', 'Forward'),
  ((select id from teams where name = 'Universel Varsity'), 'Athlete UT02', 'Defense'),
  ((select id from teams where name = 'Universel Varsity'), 'Athlete UT03', 'Goalie'),
  ((select id from teams where name = 'Universel Varsity'), 'Athlete UT04', 'Defense'),

  ((select id from teams where name = 'BU Men''s Rugby'), 'Athlete BU01', 'Prop'),
  ((select id from teams where name = 'BU Men''s Rugby'), 'Athlete BU02', 'Hooker'),
  ((select id from teams where name = 'BU Men''s Rugby'), 'Athlete BU03', 'Fly-half'),
  ((select id from teams where name = 'BU Men''s Rugby'), 'Athlete BU04', 'Fullback'),

  ((select id from teams where name = 'Iona Men''s Rugby'), 'Athlete IO01', 'Prop'),
  ((select id from teams where name = 'Iona Men''s Rugby'), 'Athlete IO02', 'Lock'),
  ((select id from teams where name = 'Iona Men''s Rugby'), 'Athlete IO03', 'Fly-half'),
  ((select id from teams where name = 'Iona Men''s Rugby'), 'Athlete IO04', 'Wing');
