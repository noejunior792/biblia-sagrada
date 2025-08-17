export interface Livro {
  id: number;
  nome: string;
  abreviacao: string;
  testamento: 'Antigo' | 'Novo';
  ordem: number;
  capitulos_total: number;
}

export interface Capitulo {
  id: number;
  livro_id: number;
  numero: number;
  versiculos_total: number;
}

export interface Versiculo {
  id: number;
  livro_id: number;
  capitulo: number;
  numero: number;
  texto: string;
}

export interface Favorito {
  id: number;
  versiculo_id: number;
  criado_em: string;
  livro_nome?: string;
  capitulo?: number;
  versiculo_numero?: number;
  texto?: string;
}

export interface Anotacao {
  id: number;
  versiculo_id: number;
  titulo: string;
  conteudo: string;
  criado_em: string;
  atualizado_em: string;
  livro_nome?: string;
  capitulo?: number;
  versiculo_numero?: number;
  texto?: string;
}

export interface HistoricoLeitura {
  id: number;
  livro_id: number;
  capitulo: number;
  acessado_em: string;
  livro_nome?: string;
}

export interface ResultadoBusca {
  versiculo_id: number;
  livro_nome: string;
  livro_abreviacao: string;
  capitulo: number;
  versiculo_numero: number;
  texto: string;
  destaque?: string;
}

export interface Configuracoes {
  tema: 'claro' | 'escuro';
  tamanho_fonte: 'pequena' | 'media' | 'grande';
  familia_fonte: string;
  mostrar_numeros_versiculos: boolean;
  versao_biblia: string;
}

export interface VersiculoDia {
  versiculo: Versiculo;
  livro_nome: string;
  referencia: string;
}

export type NavegacaoContexto = {
  livroAtual: Livro | null;
  capituloAtual: number;
  versiculoAtual?: number;
  setLivroAtual: (livro: Livro) => void;
  setCapituloAtual: (capitulo: number) => void;
  setVersiculoAtual: (versiculo?: number) => void;
};

export type TemaContexto = {
  tema: 'claro' | 'escuro';
  toggleTema: () => void;
};

export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BuscaParametros {
  termo: string;
  livro_id?: number;
  testamento?: 'Antigo' | 'Novo';
  busca_exata?: boolean;
}

export interface EstatisticasLeitura {
  total_versiculos_lidos: number;
  livros_visitados: number;
  tempo_total_leitura: number;
  sequencia_dias: number;
  ultimo_acesso: string;
}