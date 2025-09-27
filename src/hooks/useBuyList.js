import { useState, useEffect, useCallback } from 'react'
import { supabase, TABLES } from '../utils/supabaseClient'
import { useAuth } from './useAuth'

export const useBuyList = () => {
  const [buyList, setBuyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { profile } = useAuth()

  const fetchBuyList = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from(TABLES.BUY_LIST)
        .select(`
          *,
          profiles:added_by(full_name)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setBuyList(data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id])

  useEffect(() => {
    fetchBuyList()
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('buylist_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.BUY_LIST,
          filter: `company_id=eq.${profile?.company_id}`
        }, 
        (payload) => {
          console.log('Buy list change received!', payload)
          fetchBuyList()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [fetchBuyList, profile?.company_id])

  const addItem = async (itemName) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.BUY_LIST)
        .insert([
          {
            item_name: itemName,
            company_id: profile.company_id,
            added_by: profile.id,
          },
        ])
        .select(`
          *,
          profiles:added_by(full_name)
        `)

      if (error) throw error

      return { data: data[0], error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const toggleBought = async (itemId, bought) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.BUY_LIST)
        .update({ bought })
        .eq('id', itemId)
        .eq('company_id', profile.company_id)
        .select(`
          *,
          profiles:added_by(full_name)
        `)

      if (error) throw error

      return { data: data[0], error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const deleteItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from(TABLES.BUY_LIST)
        .delete()
        .eq('id', itemId)
        .eq('company_id', profile.company_id)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return {
    buyList,
    loading,
    error,
    fetchBuyList,
    addItem,
    toggleBought,
    deleteItem,
  }
}