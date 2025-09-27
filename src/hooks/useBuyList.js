import { useState, useEffect, useCallback } from 'react'
import { supabase, TABLES } from '../utils/supabaseClient'
import { useAuth } from './useAuth'

export const useBuyList = () => {
  const [buyList, setBuyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { profile } = useAuth()

  const fetchBuyList = useCallback(async () => {
    console.log('useBuyList: Profile data:', profile)
    
    if (!profile?.company_id) {
      console.warn('useBuyList: No company_id found in profile:', profile)
      setError('No company ID found. Please contact support.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('useBuyList: Fetching buy list for company_id:', profile.company_id)
      
      const { data, error } = await supabase
        .from(TABLES.BUY_LIST)
        .select(`
          *,
          profiles:added_by(full_name)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('useBuyList: Database error:', error)
        setError(error.message)
      } else {
        console.log('useBuyList: Fetched buy list:', data)
        setBuyList(data || [])
        setError(null)
      }
    } catch (err) {
      console.error('useBuyList: Catch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile])

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
      console.log('addItem: Attempting to add item:', itemName)
      console.log('addItem: Profile data:', profile)
      
      if (!profile?.company_id) {
        throw new Error('No company ID found in profile')
      }
      
      const itemData = {
        item_name: itemName,
        company_id: profile.company_id,
        added_by: profile.id,
      }
      
      console.log('addItem: Inserting data:', itemData)
      
      const { data, error } = await supabase
        .from(TABLES.BUY_LIST)
        .insert([itemData])
        .select(`
          *,
          profiles:added_by(full_name)
        `)

      if (error) {
        console.error('addItem: Database error:', error)
        throw error
      }

      console.log('addItem: Success:', data)
      return { data: data[0], error: null }
    } catch (error) {
      console.error('addItem: Error:', error)
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