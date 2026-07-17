import React, { useEffect, useState } from 'react'
import { Building2, CalendarDays, CheckCircle2, CircleAlert, IndianRupee, XCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import api from '../../lib/api'

interface PublicOffer {
  candidate_name: string
  job_title: string
  company_name: string
  company_logo?: string | null
  salary_offered: number
  joining_date: string
  offer_valid_until: string
  benefits?: string
  terms_conditions?: string
  notes?: string
  status: string
  candidate_response?: string
  responded_at?: string | null
}

const displayDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'long', year: 'numeric'
}).format(new Date(`${value}T00:00:00`))

const OfferResponse: React.FC = () => {
  const { token } = useParams()
  const [offer, setOffer] = useState<PublicOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState('')

  useEffect(() => {
    const loadOffer = async () => {
      try {
        const result = await api.get(`/api/hr/public/offers/${token}/`)
        setOffer(result.data)
        setResponse(result.data.candidate_response || '')
      } catch (requestError: any) {
        setError(requestError.response?.data?.detail || 'This offer could not be found.')
      } finally {
        setLoading(false)
      }
    }
    if (token) loadOffer()
  }, [token])

  const respond = async (decision: 'accept' | 'reject') => {
    if (!token || submitting) return
    const prompt = decision === 'accept'
      ? 'Accept this employment offer?'
      : 'Decline this employment offer?'
    if (!window.confirm(prompt)) return
    setSubmitting(true)
    setError('')
    try {
      const result = await api.post(`/api/hr/public/offers/${token}/respond/`, { decision, response })
      setOffer(result.data)
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Unable to record your response. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-600">Loading offer...</div>
  if (!offer) return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <div className="max-w-md text-center"><CircleAlert className="mx-auto h-10 w-10 text-red-500" /><h1 className="mt-4 text-2xl font-semibold">Offer unavailable</h1><p className="mt-2 text-gray-600">{error}</p></div>
    </div>
  )

  const canRespond = offer.status === 'sent'
  const completed = !canRespond
  const accepted = offer.status === 'accepted'
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-col gap-5 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            {offer.company_logo ? <img src={offer.company_logo} alt="" className="h-14 w-14 rounded-lg border object-contain" /> : <div className="grid h-14 w-14 place-items-center rounded-lg bg-indigo-50"><Building2 className="text-indigo-600" /></div>}
            <div><p className="text-sm text-gray-500">Employment offer from</p><h1 className="text-xl font-semibold text-gray-950">{offer.company_name}</h1></div>
          </div>
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase text-indigo-700">{offer.status.replace('_', ' ')}</span>
        </header>

        <div className="space-y-7 p-6 sm:p-8">
          <div><p className="text-gray-600">Dear {offer.candidate_name},</p><h2 className="mt-2 text-2xl font-semibold text-gray-950">Offer for {offer.job_title}</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4"><IndianRupee className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-xs uppercase text-gray-500">Annual salary</p><p className="font-semibold">₹{Number(offer.salary_offered).toLocaleString('en-IN')}</p></div>
            <div className="rounded-lg border p-4"><CalendarDays className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-xs uppercase text-gray-500">Joining date</p><p className="font-semibold">{displayDate(offer.joining_date)}</p></div>
            <div className="rounded-lg border p-4"><CalendarDays className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-xs uppercase text-gray-500">Respond by</p><p className="font-semibold">{displayDate(offer.offer_valid_until)}</p></div>
          </div>
          {offer.benefits && <div><h3 className="font-semibold">Benefits</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{offer.benefits}</p></div>}
          {offer.terms_conditions && <div><h3 className="font-semibold">Terms and conditions</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{offer.terms_conditions}</p></div>}
          {offer.notes && <div><h3 className="font-semibold">Additional notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{offer.notes}</p></div>}

          {completed ? (
            <div className={`rounded-lg border p-5 ${accepted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              {accepted ? <CheckCircle2 className="h-7 w-7 text-green-600" /> : <XCircle className="h-7 w-7 text-gray-500" />}
              <h3 className="mt-3 font-semibold">{accepted ? 'Offer accepted' : `Offer ${offer.status}`}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {['accepted', 'rejected'].includes(offer.status)
                  ? 'Your response has been recorded. The HR team will contact you with the next steps.'
                  : 'This offer is not currently open for a response. Please contact the HR team if you need assistance.'}
              </p>
            </div>
          ) : (
            <div className="border-t pt-6">
              <label className="text-sm font-medium text-gray-800" htmlFor="candidate-response">Message to HR (optional)</label>
              <textarea id="candidate-response" value={response} onChange={event => setResponse(event.target.value)} maxLength={5000} rows={4} className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button disabled={submitting} onClick={() => respond('reject')} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Decline offer</button>
                <button disabled={submitting} onClick={() => respond('accept')} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{submitting ? 'Submitting...' : 'Accept offer'}</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default OfferResponse
