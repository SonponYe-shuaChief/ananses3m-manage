import { useState, useEffect, useCallback } from 'react'
import { supabase, TABLES } from '../utils/supabaseClient'
import { useAuth } from './useAuth'

export const useAssignments = () => {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { profile, isManager } = useAuth()

  const fetchAssignments = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from(TABLES.ORDER_ASSIGNMENTS)
        .select(`
          *,
          orders(*),
          profiles:worker_id(full_name)
        `)

      // If worker, only show their assignments
      if (!isManager) {
        query = query.eq('worker_id', profile.id)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setAssignments(data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, isManager])

  useEffect(() => {
    fetchAssignments()
    
    // Set up realtime subscription
    const subscription = supabase
      .channel('assignments_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.ORDER_ASSIGNMENTS
        }, 
        (payload) => {
          console.log('Assignment change received!', payload)
          fetchAssignments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [fetchAssignments])

  const assignOrder = async (orderId, workerIds) => {
    try {
      // First, remove existing assignments for this order
      await supabase
        .from(TABLES.ORDER_ASSIGNMENTS)
        .delete()
        .eq('order_id', orderId)

      // Then add new assignments
      const assignmentData = workerIds.map(workerId => ({
        order_id: orderId,
        worker_id: workerId,
      }))

      const { data, error } = await supabase
        .from(TABLES.ORDER_ASSIGNMENTS)
        .insert(assignmentData)
        .select()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const toggleStarred = async (assignmentId, starred) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ORDER_ASSIGNMENTS)
        .update({ starred })
        .eq('id', assignmentId)
        .eq('worker_id', profile.id) // Ensure worker can only update their own
        .select()

      if (error) throw error

      return { data: data[0], error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  return {
    assignments,
    loading,
    error,
    fetchAssignments,
    assignOrder,
    toggleStarred,
  }
}