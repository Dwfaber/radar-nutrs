import { useState, useEffect } from 'react'
import { supabase, TABLES } from '@/lib/supabase'
import { KPIData } from '@/types'

export function useKPIs() {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchKPIs() {
      try {
        setLoading(true)

        // Total de ciclos
        const { count: totalCiclos } = await supabase
          .from(TABLES.CICLOS)
          .select('*', { count: 'exact', head: true })

        // Ciclos ativos (não cancelados e não concluídos)
        const { count: ciclosAtivos } = await supabase
          .from(TABLES.CICLOS)
          .select('*', { count: 'exact', head: true })
          .eq('cancelado', false)
          .is('concluido_em', null)

        // Somas de métricas
        const { data: metricas } = await supabase
          .from(TABLES.METRICAS)
          .select('total_planejado, total_realizado, eficiencia_producao, custo_por_refeicao_real')

        // Acréscimos
        const { data: acrescimos } = await supabase
          .from(TABLES.ACRESCIMOS)
          .select('detalhe_valor_total')

        const totalPlanejado = metricas?.reduce((acc, m) => acc + (m.total_planejado || 0), 0) || 0
        const totalRealizado = metricas?.reduce((acc, m) => acc + (m.total_realizado || 0), 0) || 0
        const eficienciaMedia = metricas?.length 
          ? metricas.reduce((acc, m) => acc + (m.eficiencia_producao || 0), 0) / metricas.length 
          : 0
        const custoMedio = metricas?.length
          ? metricas.reduce((acc, m) => acc + (m.custo_por_refeicao_real || 0), 0) / metricas.length
          : 0

        const totalAcrescimos = acrescimos?.length || 0
        const valorAcrescimos = acrescimos?.reduce((acc, a) => acc + (a.detalhe_valor_total || 0), 0) || 0

        setKpis({
          totalCiclos: totalCiclos || 0,
          ciclosAtivos: ciclosAtivos || 0,
          totalRefeicoesPlanejadas: totalPlanejado,
          totalRefeicoesRealizadas: totalRealizado,
          eficienciaMedia: Math.round(eficienciaMedia * 10) / 10,
          custoMedioRefeicao: Math.round(custoMedio * 100) / 100,
          totalAcrescimos,
          valorAcrescimos
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar KPIs')
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [])

  return { kpis, loading, error }
}
