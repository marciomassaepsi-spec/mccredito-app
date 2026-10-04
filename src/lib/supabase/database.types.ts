export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string;
          dados_antes: Json | null;
          dados_depois: Json | null;
          feito_em: string;
          id: number;
          registro_id: string;
          tabela: string;
          usuario_id: string | null;
        };
        Insert: {
          acao: string;
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          feito_em?: string;
          id?: never;
          registro_id: string;
          tabela: string;
          usuario_id?: string | null;
        };
        Update: {
          acao?: string;
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          feito_em?: string;
          id?: never;
          registro_id?: string;
          tabela?: string;
          usuario_id?: string | null;
        };
        Relationships: [];
      };
      clientes: {
        Row: {
          atualizado_em: string;
          consentimento_lgpd_em: string | null;
          cpf: string;
          criado_em: string;
          endereco: string;
          foto_documento_path: string | null;
          id: string;
          nome: string;
          observacoes: string;
          whatsapp: string;
        };
        Insert: {
          atualizado_em?: string;
          consentimento_lgpd_em?: string | null;
          cpf: string;
          criado_em?: string;
          endereco?: string;
          foto_documento_path?: string | null;
          id?: string;
          nome: string;
          observacoes?: string;
          whatsapp?: string;
        };
        Update: {
          atualizado_em?: string;
          consentimento_lgpd_em?: string | null;
          cpf?: string;
          criado_em?: string;
          endereco?: string;
          foto_documento_path?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string;
          whatsapp?: string;
        };
        Relationships: [];
      };
      configuracoes: {
        Row: {
          atualizado_em: string;
          chave_pix: string;
          cidade: string;
          cobranca_hora_fim: string;
          cobranca_hora_inicio: string;
          documento_empresa: string;
          id: boolean;
          limite_contratos_ativos: number;
          mora_limite_aviso: number;
          mora_percentual_mes: number;
          multa_limite_aviso: number;
          multa_percentual: number;
          nome_empresa: string;
          nome_recebedor_pix: string;
          razao_social: string;
          tipo_chave_pix: string;
        };
        Insert: {
          atualizado_em?: string;
          chave_pix?: string;
          cidade?: string;
          cobranca_hora_fim?: string;
          cobranca_hora_inicio?: string;
          documento_empresa?: string;
          id?: boolean;
          limite_contratos_ativos?: number;
          mora_limite_aviso?: number;
          mora_percentual_mes?: number;
          multa_limite_aviso?: number;
          multa_percentual?: number;
          nome_empresa?: string;
          nome_recebedor_pix?: string;
          razao_social?: string;
          tipo_chave_pix?: string;
        };
        Update: {
          atualizado_em?: string;
          chave_pix?: string;
          cidade?: string;
          cobranca_hora_fim?: string;
          cobranca_hora_inicio?: string;
          documento_empresa?: string;
          id?: boolean;
          limite_contratos_ativos?: number;
          mora_limite_aviso?: number;
          mora_percentual_mes?: number;
          multa_limite_aviso?: number;
          multa_percentual?: number;
          nome_empresa?: string;
          nome_recebedor_pix?: string;
          razao_social?: string;
          tipo_chave_pix?: string;
        };
        Relationships: [];
      };
      contatos_cobranca: {
        Row: {
          cliente_id: string;
          criado_em: string;
          id: string;
          observacoes: string;
          parcela_id: string | null;
          promessa_para: string | null;
          registrado_por: string | null;
          resultado: Database["public"]["Enums"]["resultado_contato"];
          tipo: Database["public"]["Enums"]["tipo_contato"];
        };
        Insert: {
          cliente_id: string;
          criado_em?: string;
          id?: string;
          observacoes?: string;
          parcela_id?: string | null;
          promessa_para?: string | null;
          registrado_por?: string | null;
          resultado: Database["public"]["Enums"]["resultado_contato"];
          tipo: Database["public"]["Enums"]["tipo_contato"];
        };
        Update: {
          cliente_id?: string;
          criado_em?: string;
          id?: string;
          observacoes?: string;
          parcela_id?: string | null;
          promessa_para?: string | null;
          registrado_por?: string | null;
          resultado?: Database["public"]["Enums"]["resultado_contato"];
          tipo?: Database["public"]["Enums"]["tipo_contato"];
        };
        Relationships: [
          {
            foreignKeyName: "contatos_cobranca_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contatos_cobranca_parcela_id_fkey";
            columns: ["parcela_id"];
            isOneToOne: false;
            referencedRelation: "parcelas";
            referencedColumns: ["id"];
          },
        ];
      };
      documentos: {
        Row: {
          caminho: string;
          cliente_id: string | null;
          criado_em: string;
          emprestimo_id: string | null;
          id: string;
          nome_arquivo: string;
          tamanho_bytes: number | null;
          tipo: Database["public"]["Enums"]["tipo_documento"];
        };
        Insert: {
          caminho: string;
          cliente_id?: string | null;
          criado_em?: string;
          emprestimo_id?: string | null;
          id?: string;
          nome_arquivo: string;
          tamanho_bytes?: number | null;
          tipo: Database["public"]["Enums"]["tipo_documento"];
        };
        Update: {
          caminho?: string;
          cliente_id?: string | null;
          criado_em?: string;
          emprestimo_id?: string | null;
          id?: string;
          nome_arquivo?: string;
          tamanho_bytes?: number | null;
          tipo?: Database["public"]["Enums"]["tipo_documento"];
        };
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documentos_emprestimo_id_fkey";
            columns: ["emprestimo_id"];
            isOneToOne: false;
            referencedRelation: "emprestimos";
            referencedColumns: ["id"];
          },
        ];
      };
      emprestimos: {
        Row: {
          atualizado_em: string;
          cliente_id: string;
          criado_em: string;
          id: string;
          liberado_em: string;
          observacoes: string;
          periodicidade: Database["public"]["Enums"]["periodicidade"];
          primeiro_vencimento: string;
          qtd_parcelas: number;
          renegociado_de: string | null;
          sistema: Database["public"]["Enums"]["sistema_amortizacao"];
          status: Database["public"]["Enums"]["status_emprestimo"];
          taxa_percentual: number;
          valor_centavos: number;
        };
        Insert: {
          atualizado_em?: string;
          cliente_id: string;
          criado_em?: string;
          id?: string;
          liberado_em: string;
          observacoes?: string;
          periodicidade?: Database["public"]["Enums"]["periodicidade"];
          primeiro_vencimento: string;
          qtd_parcelas: number;
          renegociado_de?: string | null;
          sistema: Database["public"]["Enums"]["sistema_amortizacao"];
          status?: Database["public"]["Enums"]["status_emprestimo"];
          taxa_percentual: number;
          valor_centavos: number;
        };
        Update: {
          atualizado_em?: string;
          cliente_id?: string;
          criado_em?: string;
          id?: string;
          liberado_em?: string;
          observacoes?: string;
          periodicidade?: Database["public"]["Enums"]["periodicidade"];
          primeiro_vencimento?: string;
          qtd_parcelas?: number;
          renegociado_de?: string | null;
          sistema?: Database["public"]["Enums"]["sistema_amortizacao"];
          status?: Database["public"]["Enums"]["status_emprestimo"];
          taxa_percentual?: number;
          valor_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: "emprestimos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emprestimos_renegociado_de_fkey";
            columns: ["renegociado_de"];
            isOneToOne: false;
            referencedRelation: "emprestimos";
            referencedColumns: ["id"];
          },
        ];
      };
      modelos_mensagem: {
        Row: {
          ativo: boolean;
          dias_relativos: number;
          id: string;
          texto: string;
          titulo: string;
        };
        Insert: {
          ativo?: boolean;
          dias_relativos: number;
          id?: string;
          texto: string;
          titulo: string;
        };
        Update: {
          ativo?: boolean;
          dias_relativos?: number;
          id?: string;
          texto?: string;
          titulo?: string;
        };
        Relationships: [];
      };
      pagamentos: {
        Row: {
          comprovante_path: string | null;
          criado_em: string;
          desconto_centavos: number;
          estornado: boolean;
          estornado_em: string | null;
          estorno_motivo: string | null;
          forma: Database["public"]["Enums"]["forma_pagamento"];
          id: string;
          mora_centavos: number;
          multa_centavos: number;
          observacoes: string;
          pago_em: string;
          parcela_id: string;
          registrado_por: string | null;
          valor_centavos: number;
        };
        Insert: {
          comprovante_path?: string | null;
          criado_em?: string;
          desconto_centavos?: number;
          estornado?: boolean;
          estornado_em?: string | null;
          estorno_motivo?: string | null;
          forma: Database["public"]["Enums"]["forma_pagamento"];
          id?: string;
          mora_centavos?: number;
          multa_centavos?: number;
          observacoes?: string;
          pago_em: string;
          parcela_id: string;
          registrado_por?: string | null;
          valor_centavos: number;
        };
        Update: {
          comprovante_path?: string | null;
          criado_em?: string;
          desconto_centavos?: number;
          estornado?: boolean;
          estornado_em?: string | null;
          estorno_motivo?: string | null;
          forma?: Database["public"]["Enums"]["forma_pagamento"];
          id?: string;
          mora_centavos?: number;
          multa_centavos?: number;
          observacoes?: string;
          pago_em?: string;
          parcela_id?: string;
          registrado_por?: string | null;
          valor_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pagamentos_parcela_id_fkey";
            columns: ["parcela_id"];
            isOneToOne: false;
            referencedRelation: "parcelas";
            referencedColumns: ["id"];
          },
        ];
      };
      parcelas: {
        Row: {
          amortizacao_centavos: number;
          emprestimo_id: string;
          id: string;
          juros_centavos: number;
          numero: number;
          pago_centavos: number;
          quitada_em: string | null;
          saldo_devedor_centavos: number;
          status: Database["public"]["Enums"]["status_parcela"];
          valor_centavos: number;
          vencimento: string;
        };
        Insert: {
          amortizacao_centavos: number;
          emprestimo_id: string;
          id?: string;
          juros_centavos: number;
          numero: number;
          pago_centavos?: number;
          quitada_em?: string | null;
          saldo_devedor_centavos: number;
          status?: Database["public"]["Enums"]["status_parcela"];
          valor_centavos: number;
          vencimento: string;
        };
        Update: {
          amortizacao_centavos?: number;
          emprestimo_id?: string;
          id?: string;
          juros_centavos?: number;
          numero?: number;
          pago_centavos?: number;
          quitada_em?: string | null;
          saldo_devedor_centavos?: number;
          status?: Database["public"]["Enums"]["status_parcela"];
          valor_centavos?: number;
          vencimento?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parcelas_emprestimo_id_fkey";
            columns: ["emprestimo_id"];
            isOneToOne: false;
            referencedRelation: "emprestimos";
            referencedColumns: ["id"];
          },
        ];
      };
      perfis: {
        Row: {
          ativo: boolean;
          criado_em: string;
          nome: string;
          papel: Database["public"]["Enums"]["papel_usuario"];
          user_id: string;
        };
        Insert: {
          ativo?: boolean;
          criado_em?: string;
          nome?: string;
          papel?: Database["public"]["Enums"]["papel_usuario"];
          user_id: string;
        };
        Update: {
          ativo?: boolean;
          criado_em?: string;
          nome?: string;
          papel?: Database["public"]["Enums"]["papel_usuario"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancelar_emprestimo: {
        Args: { p_id: string; p_motivo: string };
        Returns: undefined;
      };
      criar_emprestimo: {
        Args: { p_emprestimo: Json; p_parcelas: Json };
        Returns: string;
      };
      dearmor: { Args: { "": string }; Returns: string };
      eh_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      eh_membro: { Args: Record<PropertyKey, never>; Returns: boolean };
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string };
      gen_salt: { Args: { "": string }; Returns: string };
      papel_atual: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["papel_usuario"];
      };
      pgp_armor_headers: {
        Args: { "": string };
        Returns: Record<string, unknown>[];
      };
    };
    Enums: {
      forma_pagamento: "pix" | "dinheiro" | "transferencia" | "outro";
      papel_usuario: "admin" | "operador" | "cobrador";
      periodicidade: "mensal" | "quinzenal" | "semanal";
      resultado_contato:
        | "prometeu_pagar"
        | "nao_atendeu"
        | "negociando"
        | "pagou"
        | "recusou"
        | "outro";
      sistema_amortizacao: "price" | "sac" | "simples";
      status_emprestimo:
        | "ativo"
        | "quitado"
        | "em_atraso"
        | "renegociado"
        | "cancelado";
      status_parcela: "a_vencer" | "paga" | "paga_parcial" | "cancelada";
      tipo_contato: "whatsapp" | "ligacao" | "visita" | "outro";
      tipo_documento:
        | "contrato"
        | "promissoria"
        | "documento_cliente"
        | "comprovante"
        | "outro";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      forma_pagamento: ["pix", "dinheiro", "transferencia", "outro"],
      papel_usuario: ["admin", "operador", "cobrador"],
      periodicidade: ["mensal", "quinzenal", "semanal"],
      resultado_contato: [
        "prometeu_pagar",
        "nao_atendeu",
        "negociando",
        "pagou",
        "recusou",
        "outro",
      ],
      sistema_amortizacao: ["price", "sac", "simples"],
      status_emprestimo: [
        "ativo",
        "quitado",
        "em_atraso",
        "renegociado",
        "cancelado",
      ],
      status_parcela: ["a_vencer", "paga", "paga_parcial", "cancelada"],
      tipo_contato: ["whatsapp", "ligacao", "visita", "outro"],
      tipo_documento: [
        "contrato",
        "promissoria",
        "documento_cliente",
        "comprovante",
        "outro",
      ],
    },
  },
} as const;
