import { Mail } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Sobre o Prodauto</h1>
          <p className="text-sm text-gray-500">
            Inteligência de preços para marketplaces brasileiros
          </p>
        </div>

        {/* O que é */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-base font-bold text-gray-900">O que é o Prodauto?</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            O Prodauto é uma plataforma inteligente de scraping e análise de dados em tempo real,
            desenvolvida especificamente para o ecossistema de marketplaces brasileiros. O sistema
            automatiza a coleta de dados, filtra ruídos do mercado e entrega uma página de produto
            customizada, pronta para que vendedores e empresas encontrem produtos viáveis,
            descobrindo o preço, descrição e melhorias aplicáveis com base em informações reais
            de produtos vencedores para sair na frente dos concorrentes.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Utilizando algoritmos avançados de filtragem estatística (como o filtro IQR para
            remoção de outliers) e integração com Inteligência Artificial, o Prodauto transforma
            buscas brutas em relatórios consolidados de viabilidade financeira, análise de
            concorrência e comportamento de consumidores.
          </p>
        </section>

        {/* Quem criou */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-base font-bold text-gray-900">Quem Criou e Tecnologia</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            O sistema foi idealizado, projetado e desenvolvido por <strong>Vitor Costa</strong>.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            O foco do desenvolvimento foi criar uma ferramenta de alta performance que resolvesse
            duas grandes dores do e-commerce atual: a demora na pesquisa manual de concorrentes
            e a dificuldade em calcular a margem de lucro real após as complexas taxas de cada
            marketplace.
          </p>
        </section>

        {/* Contato */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-base font-bold text-gray-900">Vamos conversar?</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Se você tem interesse em soluções de automação de dados, inteligência de mercado,
            customizações do sistema ou deseja fechar uma parceria comercial, entre em contato.
          </p>
          <a
            href="mailto:vitorcostadados@gmail.com"
            className="inline-flex items-center gap-2 text-sm text-brand-600 font-medium
                       hover:text-brand-700 transition-colors"
          >
            <Mail size={16} />
            vitorcostadados@gmail.com
          </a>
        </section>
      </div>
    </AppLayout>
  )
}
