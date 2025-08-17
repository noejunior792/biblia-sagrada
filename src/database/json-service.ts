import { 
  Livro, 
  Versiculo, 
  Favorito, 
  Anotacao, 
  HistoricoLeitura, 
  ResultadoBusca, 
  VersiculoDia,
  BuscaParametros,
  DatabaseResponse 
} from '../types';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

interface BibliaJSON {
  [bookName: string]: {
    name: string;
    abbrev: string;
    chapters: string[][];
  };
}

export class JSONBibliaService {
  private bibliaData: BibliaJSON | null = null;
  private livros: Livro[] = [];
  private favoritos: Set<string> = new Set();
  private anotacoes: Map<string, Anotacao[]> = new Map();
  private historico: HistoricoLeitura[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    try {
      await this.loadBibliaData();
      this.loadLocalData();
      console.log('JSONBibliaService inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar JSONBibliaService:', error);
    }
  }

  private async loadBibliaData() {
    try {
      const isDev = !app.isPackaged;
      let assetsPath: string;
      
      if (isDev) {
        // In development, try multiple possible paths
        const possiblePaths = [
          path.join(process.cwd(), 'assets', 'KJA.json'),
          path.join(__dirname, '..', '..', 'assets', 'KJA.json'),
          path.join(app.getAppPath(), 'assets', 'KJA.json')
        ];
        
        assetsPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
      } else {
        // In production
        assetsPath = path.join(process.resourcesPath, 'assets', 'KJA.json');
      }
      
      console.log('Tentando carregar dados da Bíblia de:', assetsPath);
      
      if (!fs.existsSync(assetsPath)) {
        throw new Error(`Arquivo KJA.json não encontrado em: ${assetsPath}`);
      }
      
      const data = fs.readFileSync(assetsPath, 'utf-8');
      this.bibliaData = JSON.parse(data);
      this.processLivros();
      console.log('Dados da Bíblia carregados com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar dados da Bíblia:', error);
      throw error;
    }
  }

  private processLivros() {
    if (!this.bibliaData) return;

    const livrosAT = [
      'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
      '1samuel', '2samuel', '1kings', '2kings', '1chronicles', '2chronicles', 'ezra', 'nehemiah',
      'esther', 'job', 'psalms', 'proverbs', 'ecclesiastes', 'song', 'isaiah', 'jeremiah',
      'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah',
      'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi'
    ];

    let ordem = 1;
    this.livros = [];

    Object.keys(this.bibliaData).forEach((key, index) => {
      const bookData = this.bibliaData![key];
      const isAT = livrosAT.includes(key.toLowerCase());
      
      this.livros.push({
        id: index + 1,
        nome: bookData.name,
        abreviacao: bookData.abbrev,
        testamento: isAT ? 'Antigo' : 'Novo',
        ordem: ordem++,
        capitulos_total: bookData.chapters.length
      });
    });
  }

  private loadLocalData() {
    try {
      const userDataPath = app.getPath('userData');
      
      // Carregar favoritos
      const favoritosPath = path.join(userDataPath, 'favoritos.json');
      if (fs.existsSync(favoritosPath)) {
        const favoritosData = fs.readFileSync(favoritosPath, 'utf-8');
        this.favoritos = new Set(JSON.parse(favoritosData));
      }

      // Carregar anotações
      const anotacoesPath = path.join(userDataPath, 'anotacoes.json');
      if (fs.existsSync(anotacoesPath)) {
        const anotacoesData = fs.readFileSync(anotacoesPath, 'utf-8');
        const anotacoesArray = JSON.parse(anotacoesData);
        anotacoesArray.forEach((anotacao: Anotacao) => {
          const key = `${anotacao.versiculo_id}`;
          if (!this.anotacoes.has(key)) {
            this.anotacoes.set(key, []);
          }
          this.anotacoes.get(key)!.push(anotacao);
        });
      }

      // Carregar histórico
      const historicoPath = path.join(userDataPath, 'historico.json');
      if (fs.existsSync(historicoPath)) {
        const historicoData = fs.readFileSync(historicoPath, 'utf-8');
        this.historico = JSON.parse(historicoData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados locais:', error);
    }
  }

  private saveLocalData() {
    try {
      const userDataPath = app.getPath('userData');
      
      // Salvar favoritos
      const favoritosPath = path.join(userDataPath, 'favoritos.json');
      fs.writeFileSync(favoritosPath, JSON.stringify([...this.favoritos]));
      
      // Salvar anotações
      const todasAnotacoes: Anotacao[] = [];
      this.anotacoes.forEach(anotacoes => {
        todasAnotacoes.push(...anotacoes);
      });
      const anotacoesPath = path.join(userDataPath, 'anotacoes.json');
      fs.writeFileSync(anotacoesPath, JSON.stringify(todasAnotacoes));
      
      // Salvar histórico
      const historicoPath = path.join(userDataPath, 'historico.json');
      fs.writeFileSync(historicoPath, JSON.stringify(this.historico));
    } catch (error) {
      console.error('Erro ao salvar dados locais:', error);
    }
  }

  private generateVersiculoId(livroId: number, capitulo: number, numero: number): string {
    return `${livroId}-${capitulo}-${numero}`;
  }

  // Livros
  async getLivros(): Promise<DatabaseResponse<Livro[]>> {
    try {
      return { success: true, data: this.livros };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getLivro(id: number): Promise<DatabaseResponse<Livro>> {
    try {
      const livro = this.livros.find(l => l.id === id);
      if (!livro) {
        return { success: false, error: 'Livro não encontrado' };
      }
      return { success: true, data: livro };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Versículos
  async getVersiculosCapitulo(livroId: number, capitulo: number): Promise<DatabaseResponse<Versiculo[]>> {
    try {
      if (!this.bibliaData) {
        return { success: false, error: 'Dados da Bíblia não carregados' };
      }

      const livro = this.livros.find(l => l.id === livroId);
      if (!livro) {
        return { success: false, error: 'Livro não encontrado' };
      }

      // Encontrar o livro nos dados JSON
      const bookKey = Object.keys(this.bibliaData).find(key => 
        this.bibliaData![key].name === livro.nome
      );

      if (!bookKey || !this.bibliaData[bookKey]) {
        return { success: false, error: 'Dados do livro não encontrados' };
      }

      const bookData = this.bibliaData[bookKey];
      const capituloData = bookData.chapters[capitulo - 1];

      if (!capituloData) {
        return { success: false, error: 'Capítulo não encontrado' };
      }

      const versiculos: Versiculo[] = capituloData.map((texto, index) => ({
        id: parseInt(this.generateVersiculoId(livroId, capitulo, index + 1)),
        livro_id: livroId,
        capitulo: capitulo,
        numero: index + 1,
        texto: texto
      }));

      return { success: true, data: versiculos };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getVersiculo(id: number): Promise<DatabaseResponse<Versiculo & { livro_nome: string }>> {
    try {
      // Parsear o ID para obter livro, capítulo e número
      const idStr = id.toString();
      const parts = idStr.split('-');
      if (parts.length !== 3) {
        return { success: false, error: 'ID de versículo inválido' };
      }

      const livroId = parseInt(parts[0]);
      const capitulo = parseInt(parts[1]);
      const numero = parseInt(parts[2]);

      const versiculosResult = await this.getVersiculosCapitulo(livroId, capitulo);
      if (!versiculosResult.success || !versiculosResult.data) {
        return { success: false, error: 'Versículo não encontrado' };
      }

      const versiculo = versiculosResult.data.find(v => v.numero === numero);
      const livro = this.livros.find(l => l.id === livroId);

      if (!versiculo || !livro) {
        return { success: false, error: 'Versículo não encontrado' };
      }

      return {
        success: true,
        data: {
          ...versiculo,
          livro_nome: livro.nome
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Busca
  async buscarVersiculos(parametros: BuscaParametros): Promise<DatabaseResponse<ResultadoBusca[]>> {
    try {
      if (!this.bibliaData) {
        return { success: false, error: 'Dados da Bíblia não carregados' };
      }

      const resultados: ResultadoBusca[] = [];
      const termo = parametros.termo.toLowerCase();

      for (const livro of this.livros) {
        // Filtrar por testamento se especificado
        if (parametros.testamento && livro.testamento !== parametros.testamento) {
          continue;
        }

        // Filtrar por livro se especificado
        if (parametros.livro_id && livro.id !== parametros.livro_id) {
          continue;
        }

        // Encontrar dados do livro
        const bookKey = Object.keys(this.bibliaData).find(key => 
          this.bibliaData![key].name === livro.nome
        );

        if (!bookKey) continue;

        const bookData = this.bibliaData[bookKey];

        // Buscar em todos os capítulos
        for (let capIndex = 0; capIndex < bookData.chapters.length; capIndex++) {
          const capitulo = bookData.chapters[capIndex];

          for (let versIndex = 0; versIndex < capitulo.length; versIndex++) {
            const texto = capitulo[versIndex];
            const textoLower = texto.toLowerCase();

            let match = false;

            if (parametros.busca_exata) {
              match = textoLower.includes(termo);
            } else {
              const palavras = termo.split(' ').filter(p => p.length > 2);
              match = palavras.every(palavra => textoLower.includes(palavra));
            }

            if (match) {
              resultados.push({
                versiculo_id: parseInt(this.generateVersiculoId(livro.id, capIndex + 1, versIndex + 1)),
                livro_nome: livro.nome,
                livro_abreviacao: livro.abreviacao,
                capitulo: capIndex + 1,
                versiculo_numero: versIndex + 1,
                texto: texto
              });

              if (resultados.length >= 100) {
                return { success: true, data: resultados };
              }
            }
          }
        }
      }

      return { success: true, data: resultados };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Favoritos
  async getFavoritos(): Promise<DatabaseResponse<Favorito[]>> {
    try {
      const favoritos: Favorito[] = [];

      for (const versiculoId of this.favoritos) {
        const versiculoResult = await this.getVersiculo(parseInt(versiculoId));
        if (versiculoResult.success && versiculoResult.data) {
          const v = versiculoResult.data;
          favoritos.push({
            id: parseInt(versiculoId),
            versiculo_id: parseInt(versiculoId),
            criado_em: new Date().toISOString(),
            livro_nome: v.livro_nome,
            capitulo: v.capitulo,
            versiculo_numero: v.numero,
            texto: v.texto
          });
        }
      }

      return { success: true, data: favoritos };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async adicionarFavorito(versiculoId: number): Promise<DatabaseResponse<void>> {
    try {
      this.favoritos.add(versiculoId.toString());
      this.saveLocalData();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async removerFavorito(versiculoId: number): Promise<DatabaseResponse<void>> {
    try {
      this.favoritos.delete(versiculoId.toString());
      this.saveLocalData();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async verificarFavorito(versiculoId: number): Promise<DatabaseResponse<boolean>> {
    try {
      return { success: true, data: this.favoritos.has(versiculoId.toString()) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Anotações
  async getAnotacoes(): Promise<DatabaseResponse<Anotacao[]>> {
    try {
      const todasAnotacoes: Anotacao[] = [];
      this.anotacoes.forEach(anotacoes => {
        todasAnotacoes.push(...anotacoes);
      });
      return { success: true, data: todasAnotacoes };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getAnotacoesVersiculo(versiculoId: number): Promise<DatabaseResponse<Anotacao[]>> {
    try {
      const key = versiculoId.toString();
      const anotacoes = this.anotacoes.get(key) || [];
      return { success: true, data: anotacoes };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async adicionarAnotacao(versiculoId: number, titulo: string, conteudo: string): Promise<DatabaseResponse<Anotacao>> {
    try {
      const key = versiculoId.toString();
      const agora = new Date().toISOString();
      const novaAnotacao: Anotacao = {
        id: Date.now(),
        versiculo_id: versiculoId,
        titulo,
        conteudo,
        criado_em: agora,
        atualizado_em: agora
      };

      if (!this.anotacoes.has(key)) {
        this.anotacoes.set(key, []);
      }
      this.anotacoes.get(key)!.push(novaAnotacao);
      this.saveLocalData();

      return { success: true, data: novaAnotacao };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async atualizarAnotacao(id: number, titulo: string, conteudo: string): Promise<DatabaseResponse<void>> {
    try {
      let encontrada = false;
      this.anotacoes.forEach(anotacoes => {
        const anotacao = anotacoes.find(a => a.id === id);
        if (anotacao) {
          anotacao.titulo = titulo;
          anotacao.conteudo = conteudo;
          anotacao.atualizado_em = new Date().toISOString();
          encontrada = true;
        }
      });

      if (!encontrada) {
        return { success: false, error: 'Anotação não encontrada' };
      }

      this.saveLocalData();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async removerAnotacao(id: number): Promise<DatabaseResponse<void>> {
    try {
      let removida = false;
      this.anotacoes.forEach((anotacoes, key) => {
        const index = anotacoes.findIndex(a => a.id === id);
        if (index !== -1) {
          anotacoes.splice(index, 1);
          if (anotacoes.length === 0) {
            this.anotacoes.delete(key);
          }
          removida = true;
        }
      });

      if (!removida) {
        return { success: false, error: 'Anotação não encontrada' };
      }

      this.saveLocalData();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Histórico
  async adicionarHistorico(livroId: number, capitulo: number): Promise<DatabaseResponse<void>> {
    try {
      // Remove entrada existente
      this.historico = this.historico.filter(h => !(h.livro_id === livroId && h.capitulo === capitulo));

      // Adiciona nova entrada
      const livro = this.livros.find(l => l.id === livroId);
      const novoHistorico: HistoricoLeitura = {
        id: Date.now(),
        livro_id: livroId,
        capitulo,
        acessado_em: new Date().toISOString(),
        livro_nome: livro?.nome
      };

      this.historico.unshift(novoHistorico);

      // Mantém apenas os últimos 50
      if (this.historico.length > 50) {
        this.historico = this.historico.slice(0, 50);
      }

      this.saveLocalData();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getHistorico(): Promise<DatabaseResponse<HistoricoLeitura[]>> {
    try {
      return { success: true, data: this.historico.slice(0, 20) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Versículo do dia
  async getVersiculoDia(): Promise<DatabaseResponse<VersiculoDia>> {
    try {
      const hoje = new Date();
      const seed = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
      
      // Usar seed para escolher um livro e capítulo aleatório
      const livroIndex = seed % this.livros.length;
      const livro = this.livros[livroIndex];
      
      const capituloNum = (seed % livro.capitulos_total) + 1;
      const versiculosResult = await this.getVersiculosCapitulo(livro.id, capituloNum);
      
      if (!versiculosResult.success || !versiculosResult.data) {
        return { success: false, error: 'Erro ao obter versículo do dia' };
      }

      const versiculos = versiculosResult.data;
      const versiculoIndex = seed % versiculos.length;
      const versiculo = versiculos[versiculoIndex];

      return {
        success: true,
        data: {
          versiculo,
          livro_nome: livro.nome,
          referencia: `${livro.nome} ${capituloNum}:${versiculo.numero}`
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Configurações (usando sistema de arquivos)
  async getConfiguracao(chave: string): Promise<DatabaseResponse<string>> {
    try {
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'config.json');
      
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        return { success: true, data: config[chave] || '' };
      }
      
      return { success: true, data: '' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async setConfiguracao(chave: string, valor: string): Promise<DatabaseResponse<void>> {
    try {
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'config.json');
      
      let config: Record<string, string> = {};
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(configData);
      }
      
      config[chave] = valor;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Estatísticas
  async getEstatisticas(): Promise<DatabaseResponse<Record<string, unknown>>> {
    try {
      const todasAnotacoes: Anotacao[] = [];
      this.anotacoes.forEach(anotacoes => {
        todasAnotacoes.push(...anotacoes);
      });

      const livrosVisitados = new Set(this.historico.map(h => h.livro_id));

      return {
        success: true,
        data: {
          total_versiculos: 31102, // Número aproximado de versículos na Bíblia
          total_favoritos: this.favoritos.size,
          total_anotacoes: todasAnotacoes.length,
          livros_visitados: livrosVisitados.size
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

// Instância singleton do serviço
let serviceInstance: JSONBibliaService | null = null;
let initPromise: Promise<JSONBibliaService> | null = null;

export const getJSONBibliaService = (): JSONBibliaService => {
  if (!serviceInstance) {
    serviceInstance = new JSONBibliaService();
  }
  return serviceInstance;
};

export const initJSONBibliaService = async (): Promise<JSONBibliaService> => {
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = new Promise((resolve) => {
    if (!serviceInstance) {
      serviceInstance = new JSONBibliaService();
      // Wait a bit for initialization to complete
      setTimeout(() => resolve(serviceInstance), 100);
    } else {
      resolve(serviceInstance);
    }
  });
  
  return initPromise;
};