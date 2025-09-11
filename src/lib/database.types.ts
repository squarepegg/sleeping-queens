export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          state: any; // JSONB
          created_at: string;
          updated_at: string;
          is_active: boolean;
          room_code: string;
          max_players: number;
          current_players: number;
        };
        Insert: {
          id?: string;
          state: any;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          room_code: string;
          max_players?: number;
          current_players?: number;
        };
        Update: {
          id?: string;
          state?: any;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          room_code?: string;
          max_players?: number;
          current_players?: number;
        };
      };
      players: {
        Row: {
          id: string;
          game_id: string;
          user_id: string | null;
          name: string;
          position: number | null;
          is_connected: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id?: string | null;
          name: string;
          position?: number | null;
          is_connected?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          user_id?: string | null;
          name?: string;
          position?: number | null;
          is_connected?: boolean;
          joined_at?: string;
        };
      };
      game_moves: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          move_data: any; // JSONB
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          move_data: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_id?: string;
          move_data?: any;
          created_at?: string;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          username: string;
          session_token: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          username: string;
          session_token: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          username?: string;
          session_token?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type GameRow = Database['public']['Tables']['games']['Row'];
export type PlayerRow = Database['public']['Tables']['players']['Row'];
export type GameMoveRow = Database['public']['Tables']['game_moves']['Row'];
export type UserSessionRow = Database['public']['Tables']['user_sessions']['Row'];

export type GameInsert = Database['public']['Tables']['games']['Insert'];
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];
export type GameMoveInsert = Database['public']['Tables']['game_moves']['Insert'];
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert'];