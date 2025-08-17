import { getDatabase } from './database';
import { getBibliaService } from './services';

export class SampleDataPopulator {
  private db = getDatabase();
  private bibliaService = getBibliaService();

  async populateSampleVerses(): Promise<void> {
    console.log('Populando banco com versículos de exemplo...');

    try {
      // Verificar se já existem versículos
      const existingVerses = await this.db.all('SELECT COUNT(*) as count FROM versiculos');
      if ((existingVerses[0] as { count: number })?.count > 0) {
        console.log('Banco já possui versículos');
        return;
      }

      // Versículos de exemplo para demonstração
      const sampleVerses = [
        // Gênesis 1
        { livroId: 1, capitulo: 1, numero: 1, texto: 'No princípio criou Deus os céus e a terra.' },
        { livroId: 1, capitulo: 1, numero: 2, texto: 'E a terra era sem forma e vazia; e havia trevas sobre a face do abismo; e o Espírito de Deus se movia sobre a face das águas.' },
        { livroId: 1, capitulo: 1, numero: 3, texto: 'E disse Deus: Haja luz; e houve luz.' },
        
        // João 3
        { livroId: 43, capitulo: 3, numero: 16, texto: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
        
        // Salmos 23
        { livroId: 19, capitulo: 23, numero: 1, texto: 'O Senhor é o meu pastor; nada me faltará.' },
        { livroId: 19, capitulo: 23, numero: 2, texto: 'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.' },
        
        // Provérbios 3
        { livroId: 20, capitulo: 3, numero: 5, texto: 'Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.' },
        { livroId: 20, capitulo: 3, numero: 6, texto: 'Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.' },
        
        // Mateus 5
        { livroId: 40, capitulo: 5, numero: 3, texto: 'Bem-aventurados os pobres de espírito, porque deles é o reino dos céus.' },
        { livroId: 40, capitulo: 5, numero: 4, texto: 'Bem-aventurados os que choram, porque eles serão consolados.' },
        
        // Romanos 8
        { livroId: 45, capitulo: 8, numero: 28, texto: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.' },
        
        // Filipenses 4
        { livroId: 50, capitulo: 4, numero: 13, texto: 'Posso todas as coisas em Cristo que me fortalece.' },
        
        // 1 Coríntios 13
        { livroId: 46, capitulo: 13, numero: 4, texto: 'O amor é sofredor, é benigno; o amor não é invejoso; o amor não trata com leviandade, não se ensoberbece.' },
        { livroId: 46, capitulo: 13, numero: 13, texto: 'Agora, pois, permanecem a fé, a esperança e o amor, estes três; mas o maior destes é o amor.' }
      ];

      // Inserir versículos de exemplo
      for (const verse of sampleVerses) {
        await this.bibliaService.inserirVersiculo(
          verse.livroId,
          verse.capitulo,
          verse.numero,
          verse.texto
        );
      }

      console.log(`${sampleVerses.length} versículos de exemplo inseridos com sucesso!`);

    } catch (error) {
      console.error('Erro ao popular versículos de exemplo:', error);
      throw error;
    }
  }

  async createSampleData(): Promise<void> {
    await this.populateSampleVerses();
  }
}

export const getSampleDataPopulator = (): SampleDataPopulator => {
  return new SampleDataPopulator();
};