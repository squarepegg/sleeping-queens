-- ============================================
-- MINIMAL WORKING MIGRATION
-- Just the essentials that will fix your issues
-- ============================================

-- 1. Add version tracking (MOST IMPORTANT)
ALTER TABLE games ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 2. Create auto-increment function
CREATE OR REPLACE FUNCTION increment_game_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Add trigger for auto-increment
DROP TRIGGER IF EXISTS games_version_trigger ON games;
CREATE TRIGGER games_version_trigger
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION increment_game_version();

-- 4. Add index for version queries
CREATE INDEX IF NOT EXISTS idx_games_version ON games(id, version);

-- 5. Create the ESSENTIAL atomic update function
CREATE OR REPLACE FUNCTION update_game_atomic(
  p_game_id UUID,
  p_game_state JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_current_version INTEGER;
  v_expected_version INTEGER;
BEGIN
  -- Get the version from the state being submitted
  v_expected_version := COALESCE((p_game_state->>'version')::INTEGER, 1);

  -- Lock the row and get current version
SELECT version INTO v_current_version
FROM games
WHERE id = p_game_id
    FOR UPDATE;

-- Check if we can update (no conflict)
IF v_current_version IS NULL OR v_current_version = v_expected_version - 1 THEN
    -- Safe to update
UPDATE games
SET state = p_game_state
WHERE id = p_game_id;

RETURN jsonb_build_object(
        'success', true,
        'version', COALESCE(v_current_version, 0) + 1
       );
ELSE
    -- Version conflict - client needs to reload
    RETURN jsonb_build_object(
      'success', false,
      'error', 'version_conflict',
      'current_version', v_current_version,
      'expected_version', v_expected_version
    );
END IF;
END;
$$;

-- That's it! This minimal migration gives you:
-- ✅ Version tracking to prevent conflicts
-- ✅ Auto-incrementing versions
-- ✅ Atomic updates with conflict detection
-- ✅ No complex statements that break Supabase

-- Note: Realtime should already be enabled from your initial setup
-- If not, enable it manually in the Supabase dashboard:
-- Database > Replication > Enable tables: games, players

-- [
--   {
--     "specific_catalog": "postgres",
--     "specific_schema": "public",
--     "specific_name": "join_game_atomic_17530",
--     "routine_catalog": "postgres",
--     "routine_schema": "public",
--     "routine_name": "join_game_atomic",
--     "routine_type": "FUNCTION",
--     "module_catalog": null,
--     "module_schema": null,
--     "module_name": null,
--     "udt_catalog": null,
--     "udt_schema": null,
--     "udt_name": null,
--     "data_type": "jsonb",
--     "character_maximum_length": null,
--     "character_octet_length": null,
--     "character_set_catalog": null,
--     "character_set_schema": null,
--     "character_set_name": null,
--     "collation_catalog": null,
--     "collation_schema": null,
--     "collation_name": null,
--     "numeric_precision": null,
--     "numeric_precision_radix": null,
--     "numeric_scale": null,
--     "datetime_precision": null,
--     "interval_type": null,
--     "interval_precision": null,
--     "type_udt_catalog": "postgres",
--     "type_udt_schema": "pg_catalog",
--     "type_udt_name": "jsonb",
--     "scope_catalog": null,
--     "scope_schema": null,
--     "scope_name": null,
--     "maximum_cardinality": null,
--     "dtd_identifier": "0",
--     "routine_body": "EXTERNAL",
--     "routine_definition": "\nDECLARE\n  v_game_id UUID;\n  v_game_state JSONB;\n  v_max_players INTEGER;\n  v_current_players INTEGER;\n  v_position INTEGER;\n  v_player_exists BOOLEAN;\nBEGIN\n  -- Get game info with lock\n  SELECT id, state, max_players\n  INTO v_game_id, v_game_state, v_max_players\n  FROM games\n  WHERE room_code = p_room_code AND is_active = true\n  FOR UPDATE;\n\n  IF v_game_id IS NULL THEN\n    RETURN jsonb_build_object('success', false, 'error', 'Game not found');\n  END IF;\n\n  -- Check if player already exists\n  SELECT EXISTS (\n    SELECT 1 FROM players \n    WHERE game_id = v_game_id AND user_id = p_user_id\n  ) INTO v_player_exists;\n\n  IF v_player_exists THEN\n    -- Player rejoining - update connection status\n    UPDATE players\n    SET is_connected = true, last_seen = NOW()\n    WHERE game_id = v_game_id AND user_id = p_user_id;\n    \n    RETURN jsonb_build_object(\n      'success', true,\n      'game_id', v_game_id,\n      'already_joined', true\n    );\n  END IF;\n\n  -- Check player count\n  SELECT COUNT(*) INTO v_current_players\n  FROM players WHERE game_id = v_game_id;\n\n  IF v_current_players >= v_max_players THEN\n    RETURN jsonb_build_object('success', false, 'error', 'Game is full');\n  END IF;\n\n  -- Check if game already started\n  IF (v_game_state->>'phase') != 'waiting' THEN\n    RETURN jsonb_build_object('success', false, 'error', 'Game already started');\n  END IF;\n\n  -- Add player\n  v_position := v_current_players;\n  \n  INSERT INTO players (game_id, user_id, name, position, is_connected)\n  VALUES (v_game_id, p_user_id, p_username, v_position, true);\n\n  -- Update game state with new player\n  v_game_state := jsonb_set(\n    v_game_state,\n    '{players}',\n    COALESCE(v_game_state->'players', '[]'::jsonb) || jsonb_build_array(\n      jsonb_build_object(\n        'id', p_user_id,\n        'name', p_username,\n        'position', v_position,\n        'hand', '[]'::jsonb,\n        'awakeQueens', '[]'::jsonb,\n        'score', 0,\n        'isConnected', true\n      )\n    )\n  );\n\n  -- Update version if it exists\n  IF v_game_state ? 'version' THEN\n    v_game_state := jsonb_set(\n      v_game_state,\n      '{version}',\n      to_jsonb(COALESCE((v_game_state->>'version')::INTEGER, 0) + 1)\n    );\n  END IF;\n\n  UPDATE games\n  SET state = v_game_state\n  WHERE id = v_game_id;\n\n  RETURN jsonb_build_object(\n    'success', true,\n    'game_id', v_game_id,\n    'position', v_position\n  );\nEND;\n",
--     "external_name": null,
--     "external_language": "PLPGSQL",
--     "parameter_style": "GENERAL",
--     "is_deterministic": "NO",
--     "sql_data_access": "MODIFIES",
--     "is_null_call": "NO",
--     "sql_path": null,
--     "schema_level_routine": "YES",
--     "max_dynamic_result_sets": 0,
--     "is_user_defined_cast": null,
--     "is_implicitly_invocable": null,
--     "security_type": "DEFINER",
--     "to_sql_specific_catalog": null,
--     "to_sql_specific_schema": null,
--     "to_sql_specific_name": null,
--     "as_locator": "NO",
--     "created": null,
--     "last_altered": null,
--     "new_savepoint_level": null,
--     "is_udt_dependent": "NO",
--     "result_cast_from_data_type": null,
--     "result_cast_as_locator": null,
--     "result_cast_char_max_length": null,
--     "result_cast_char_octet_length": null,
--     "result_cast_char_set_catalog": null,
--     "result_cast_char_set_schema": null,
--     "result_cast_char_set_name": null,
--     "result_cast_collation_catalog": null,
--     "result_cast_collation_schema": null,
--     "result_cast_collation_name": null,
--     "result_cast_numeric_precision": null,
--     "result_cast_numeric_precision_radix": null,
--     "result_cast_numeric_scale": null,
--     "result_cast_datetime_precision": null,
--     "result_cast_interval_type": null,
--     "result_cast_interval_precision": null,
--     "result_cast_type_udt_catalog": null,
--     "result_cast_type_udt_schema": null,
--     "result_cast_type_udt_name": null,
--     "result_cast_scope_catalog": null,
--     "result_cast_scope_schema": null,
--     "result_cast_scope_name": null,
--     "result_cast_maximum_cardinality": null,
--     "result_cast_dtd_identifier": null
--   },
--   {
--     "specific_catalog": "postgres",
--     "specific_schema": "public",
--     "specific_name": "start_game_atomic_17531",
--     "routine_catalog": "postgres",
--     "routine_schema": "public",
--     "routine_name": "start_game_atomic",
--     "routine_type": "FUNCTION",
--     "module_catalog": null,
--     "module_schema": null,
--     "module_name": null,
--     "udt_catalog": null,
--     "udt_schema": null,
--     "udt_name": null,
--     "data_type": "jsonb",
--     "character_maximum_length": null,
--     "character_octet_length": null,
--     "character_set_catalog": null,
--     "character_set_schema": null,
--     "character_set_name": null,
--     "collation_catalog": null,
--     "collation_schema": null,
--     "collation_name": null,
--     "numeric_precision": null,
--     "numeric_precision_radix": null,
--     "numeric_scale": null,
--     "datetime_precision": null,
--     "interval_type": null,
--     "interval_precision": null,
--     "type_udt_catalog": "postgres",
--     "type_udt_schema": "pg_catalog",
--     "type_udt_name": "jsonb",
--     "scope_catalog": null,
--     "scope_schema": null,
--     "scope_name": null,
--     "maximum_cardinality": null,
--     "dtd_identifier": "0",
--     "routine_body": "EXTERNAL",
--     "routine_definition": "\nDECLARE\n  v_game_state JSONB;\n  v_player_count INTEGER;\n  v_is_host BOOLEAN;\nBEGIN\n  -- Lock the game row\n  SELECT state INTO v_game_state\n  FROM games\n  WHERE id = p_game_id\n  FOR UPDATE;\n\n  IF v_game_state IS NULL THEN\n    RETURN jsonb_build_object('success', false, 'error', 'Game not found');\n  END IF;\n\n  -- Check if player is host (first player)\n  SELECT position = 0 INTO v_is_host\n  FROM players\n  WHERE game_id = p_game_id AND user_id = p_player_id;\n\n  IF NOT v_is_host THEN\n    RETURN jsonb_build_object('success', false, 'error', 'Only host can start game');\n  END IF;\n\n  -- Check if already started\n  IF (v_game_state->>'phase') != 'waiting' THEN\n    RETURN jsonb_build_object('success', false, 'error', 'Game already started');\n  END IF;\n\n  -- Check player count\n  SELECT COUNT(*) INTO v_player_count\n  FROM players\n  WHERE game_id = p_game_id AND is_connected = true;\n\n  IF v_player_count < 2 THEN\n    RETURN jsonb_build_object('success', false, 'error', 'Need at least 2 players');\n  END IF;\n\n  -- Update phase to 'playing'\n  v_game_state := jsonb_set(v_game_state, '{phase}', '\"playing\"');\n  \n  -- Update version if it exists\n  IF v_game_state ? 'version' THEN\n    v_game_state := jsonb_set(\n      v_game_state,\n      '{version}',\n      to_jsonb(COALESCE((v_game_state->>'version')::INTEGER, 0) + 1)\n    );\n  END IF;\n\n  UPDATE games\n  SET state = v_game_state\n  WHERE id = p_game_id;\n\n  RETURN jsonb_build_object('success', true, 'state', v_game_state);\nEND;\n",
--     "external_name": null,
--     "external_language": "PLPGSQL",
--     "parameter_style": "GENERAL",
--     "is_deterministic": "NO",
--     "sql_data_access": "MODIFIES",
--     "is_null_call": "NO",
--     "sql_path": null,
--     "schema_level_routine": "YES",
--     "max_dynamic_result_sets": 0,
--     "is_user_defined_cast": null,
--     "is_implicitly_invocable": null,
--     "security_type": "DEFINER",
--     "to_sql_specific_catalog": null,
--     "to_sql_specific_schema": null,
--     "to_sql_specific_name": null,
--     "as_locator": "NO",
--     "created": null,
--     "last_altered": null,
--     "new_savepoint_level": null,
--     "is_udt_dependent": "NO",
--     "result_cast_from_data_type": null,
--     "result_cast_as_locator": null,
--     "result_cast_char_max_length": null,
--     "result_cast_char_octet_length": null,
--     "result_cast_char_set_catalog": null,
--     "result_cast_char_set_schema": null,
--     "result_cast_char_set_name": null,
--     "result_cast_collation_catalog": null,
--     "result_cast_collation_schema": null,
--     "result_cast_collation_name": null,
--     "result_cast_numeric_precision": null,
--     "result_cast_numeric_precision_radix": null,
--     "result_cast_numeric_scale": null,
--     "result_cast_datetime_precision": null,
--     "result_cast_interval_type": null,
--     "result_cast_interval_precision": null,
--     "result_cast_type_udt_catalog": null,
--     "result_cast_type_udt_schema": null,
--     "result_cast_type_udt_name": null,
--     "result_cast_scope_catalog": null,
--     "result_cast_scope_schema": null,
--     "result_cast_scope_name": null,
--     "result_cast_maximum_cardinality": null,
--     "result_cast_dtd_identifier": null
--   },
--   {
--     "specific_catalog": "postgres",
--     "specific_schema": "public",
--     "specific_name": "update_game_atomic_17507",
--     "routine_catalog": "postgres",
--     "routine_schema": "public",
--     "routine_name": "update_game_atomic",
--     "routine_type": "FUNCTION",
--     "module_catalog": null,
--     "module_schema": null,
--     "module_name": null,
--     "udt_catalog": null,
--     "udt_schema": null,
--     "udt_name": null,
--     "data_type": "jsonb",
--     "character_maximum_length": null,
--     "character_octet_length": null,
--     "character_set_catalog": null,
--     "character_set_schema": null,
--     "character_set_name": null,
--     "collation_catalog": null,
--     "collation_schema": null,
--     "collation_name": null,
--     "numeric_precision": null,
--     "numeric_precision_radix": null,
--     "numeric_scale": null,
--     "datetime_precision": null,
--     "interval_type": null,
--     "interval_precision": null,
--     "type_udt_catalog": "postgres",
--     "type_udt_schema": "pg_catalog",
--     "type_udt_name": "jsonb",
--     "scope_catalog": null,
--     "scope_schema": null,
--     "scope_name": null,
--     "maximum_cardinality": null,
--     "dtd_identifier": "0",
--     "routine_body": "EXTERNAL",
--     "routine_definition": "\nDECLARE\nv_current_version INTEGER;\n  v_expected_version INTEGER;\nBEGIN\n  -- Get the version from the state being submitted\n  v_expected_version := COALESCE((p_game_state->>'version')::INTEGER, 1);\n\n  -- Lock the row and get current version\nSELECT version INTO v_current_version\nFROM games\nWHERE id = p_game_id\n    FOR UPDATE;\n\n-- Check if we can update (no conflict)\nIF v_current_version IS NULL OR v_current_version = v_expected_version - 1 THEN\n    -- Safe to update\nUPDATE games\nSET state = p_game_state\nWHERE id = p_game_id;\n\nRETURN jsonb_build_object(\n        'success', true,\n        'version', COALESCE(v_current_version, 0) + 1\n       );\nELSE\n    -- Version conflict - client needs to reload\n    RETURN jsonb_build_object(\n      'success', false,\n      'error', 'version_conflict',\n      'current_version', v_current_version,\n      'expected_version', v_expected_version\n    );\nEND IF;\nEND;\n",
--     "external_name": null,
--     "external_language": "PLPGSQL",
--     "parameter_style": "GENERAL",
--     "is_deterministic": "NO",
--     "sql_data_access": "MODIFIES",
--     "is_null_call": "NO",
--     "sql_path": null,
--     "schema_level_routine": "YES",
--     "max_dynamic_result_sets": 0,
--     "is_user_defined_cast": null,
--     "is_implicitly_invocable": null,
--     "security_type": "DEFINER",
--     "to_sql_specific_catalog": null,
--     "to_sql_specific_schema": null,
--     "to_sql_specific_name": null,
--     "as_locator": "NO",
--     "created": null,
--     "last_altered": null,
--     "new_savepoint_level": null,
--     "is_udt_dependent": "NO",
--     "result_cast_from_data_type": null,
--     "result_cast_as_locator": null,
--     "result_cast_char_max_length": null,
--     "result_cast_char_octet_length": null,
--     "result_cast_char_set_catalog": null,
--     "result_cast_char_set_schema": null,
--     "result_cast_char_set_name": null,
--     "result_cast_collation_catalog": null,
--     "result_cast_collation_schema": null,
--     "result_cast_collation_name": null,
--     "result_cast_numeric_precision": null,
--     "result_cast_numeric_precision_radix": null,
--     "result_cast_numeric_scale": null,
--     "result_cast_datetime_precision": null,
--     "result_cast_interval_type": null,
--     "result_cast_interval_precision": null,
--     "result_cast_type_udt_catalog": null,
--     "result_cast_type_udt_schema": null,
--     "result_cast_type_udt_name": null,
--     "result_cast_scope_catalog": null,
--     "result_cast_scope_schema": null,
--     "result_cast_scope_name": null,
--     "result_cast_maximum_cardinality": null,
--     "result_cast_dtd_identifier": null
--   }
-- ]