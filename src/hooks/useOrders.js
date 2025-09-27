import { useState, useEffect, useCallback } from 'react'
import { supabase, TABLES } from '../utils/supabaseClient'
import { useAuth } from './useAuth'

export const useOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { profile, isManager } = useAuth()

  const fetchOrders = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from(TABLES.ORDERS)
        .select(`
          *,
          profiles:created_by(full_name),
          order_assignments(
            id,
            worker_id,
            starred,
            profiles:worker_id(full_name)
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      // If worker, only show assigned orders
      if (!isManager) {
        query = query.in('id', 
          supabase
            .from(TABLES.ORDER_ASSIGNMENTS)
            .select('order_id')
            .eq('worker_id', profile.id)
        )
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setOrders(data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.company_id, profile?.id, isManager])

  useEffect(() => {
    fetchOrders()
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('orders_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.ORDERS,
          filter: `company_id=eq.${profile?.company_id}`
        }, 
        (payload) => {
          console.log('Orders change received!', payload)
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [fetchOrders, profile?.company_id])

  const createOrder = async (orderData) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ORDERS)
        .insert([
          {
            ...orderData,
            company_id: profile.company_id,
            created_by: profile.id,
          },
        ])
        .select()

      if (error) throw error

      return { data: data[0], error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const updateOrder = async (orderId, updates) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ORDERS)
        .update(updates)
        .eq('id', orderId)
        .eq('company_id', profile.company_id)
        .select()

      if (error) throw error

      return { data: data[0], error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const deleteOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from(TABLES.ORDERS)
        .delete()
        .eq('id', orderId)
        .eq('company_id', profile.company_id)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
  }
}