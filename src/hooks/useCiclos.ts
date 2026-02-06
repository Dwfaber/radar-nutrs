import { useState, useEffect } from 'react'
import { supabase, TABLES } from '@/lib/supabase'
import { Ciclo, Metrica, CicloComMetrica } from '@/types'

function getCicloStatus(ciclo: Ciclo): CicloComMetrica['status'] {
  if (ciclo.cancelado) return 'cancelado'
  if (ciclo.concluido_em) return 'concluido'
  if (ciclo.enviado_em) return 'em_andamento'
  return 'planejamento'
}

export function useCiclos(filialId?: number) {
  const [ciclos, setCiclos] = useState<CicloComMetrica[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCiclos() {
      try {
        setLoading(true)
        
        // Buscar ciclos
        let query = supabase
          .from(TABLES.CICLOS)
          .select('*')
          .order('semana_de', { ascending: false })
          .limit(50)
        
        if (filialId) {
          query = query.eq('filial_id', filialId)
        }

        const { data: ciclosData, error: ciclosError } = await query

        if (ciclosError) throw ciclosError

        // Buscar métricas
        const { data: metricasData, error: metricasError } = await supabase
          .from(TABLES.METRICAS)
          .select('*')

        if (metricasError) throw metricasError

        // Combinar ciclos com métricas
        const metricasMap = new Map<number, Metrica>()
        metricasData?.forEach((m: Metrica) => {
          metricasMap.set(m.solicitacao_compra_id, m)
        })

        const ciclosComMetricas: CicloComMetrica[] = (ciclosData || []).map((c: Ciclo) => ({
          ...c,
          metrica: metricasMap.get(c.solicitacao_compra_id),
          status: getCicloStatus(c)
        }))

        setCiclos(ciclosComMetricas)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar ciclos')
      } finally {
        setLoading(false)
      }
    }

    fetchCiclos()
  }, [filialId])

  return { ciclos, loading, error }
}

export function useCicloDetalhe(solicitacaoCompraId: number) {
  const [ciclo, setCiclo] = useState<CicloComMetrica | null>(null)
  const [diarios, setDiarios] = useState<any[]>([])
  const [acrescimos, setAcrescimos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDetalhe() {
      try {
        setLoading(true)

        // Ciclo
        const { data: cicloData, error: cicloError } = await supabase
          .from(TABLES.CICLOS)
          .select('*')
          .eq('solicitacao_compra_id', solicitacaoCompraId)
          .single()

        if (cicloError) throw cicloError

        // Métrica
        const { data: metricaData } = await supabase
          .from(TABLES.METRICAS)
          .select('*')
          .eq('solicitacao_compra_id', solicitacaoCompraId)
          .single()

        // Diários
        const { data: diariosData, error: diariosError } = await supabase
          .from(TABLES.DIARIOS)
          .select('*')
          .eq('solicitacao_compra_id', solicitacaoCompraId)
          .order('data', { ascending: true })

        if (diariosError) throw diariosError

        // Acréscimos
        const { data: acrescimosData, error: acrescimosError } = await supabase
          .from(TABLES.ACRESCIMOS)
          .select('*')
          .eq('solicitacao_compra_id', solicitacaoCompraId)

        if (acrescimosError) throw acrescimosError

        setCiclo({
          ...cicloData,
          metrica: metricaData,
          status: getCicloStatus(cicloData)
        })
        setDiarios(diariosData || [])
        setAcrescimos(acrescimosData || [])

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes')
      } finally {
        setLoading(false)
      }
    }

    if (solicitacaoCompraId) {
      fetchDetalhe()
    }
  }, [solicitacaoCompraId])

  return { ciclo, diarios, acrescimos, loading, error }
}
