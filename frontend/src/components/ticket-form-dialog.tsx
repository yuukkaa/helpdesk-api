import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api, errorText } from '@/lib/api'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

interface AiSuggestResponse {
  category_id?: number
  priority?: string
  reason?: string
}

export function TicketFormDialog({ open, onOpenChange, onCreated }: TicketFormDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [priority, setPriority] = useState<string>('medium')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (open) {
      api<{ data: Category[] } | Category[]>('/categories')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || []
          setCategories(list)
          if (list.length > 0 && !categoryId) {
            setCategoryId(String(list[0].id))
          }
        })
        .catch(() => {})
    }
  }, [open])

  const handleAiSuggest = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('Сначала введите тему и описание обращения')
      return
    }

    setAiLoading(true)
    try {
      const res = await api<AiSuggestResponse>('/ai/suggest-ticket', {
        method: 'POST',
        body: {
          subject,
          description,
        },
      })

      if (res.category_id) {
        setCategoryId(String(res.category_id))
      }
      if (res.priority) {
        setPriority(res.priority)
      }
      if (res.reason) {
        toast.info(res.reason)
      } else {
        toast.success('Категория и приоритет определены')
      }
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      toast.error('Заполните тему и описание')
      return
    }

    const selectedCat = categoryId ? Number(categoryId) : categories[0]?.id
    if (!selectedCat) {
      toast.error('Выберите категорию обращения')
      return
    }

    setLoading(true)
    try {
      await api('/tickets', {
        method: 'POST',
        body: {
          category_id: selectedCat,
          subject,
          description,
          priority,
        },
      })
      toast.success('Заявка успешно создана')
      onOpenChange(false)
      setSubject('')
      setDescription('')
      setCategoryId(categories[0] ? String(categories[0].id) : '')
      setPriority('medium')
      onCreated?.()
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Новая заявка</DialogTitle>
          <DialogDescription>
            Опишите проблему. Категорию и приоритет можно выбрать вручную или доверить ИИ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="subject">Тема</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Кратко опишите проблему"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание проблемы..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="urgent">Срочный</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleAiSuggest}
              disabled={aiLoading}
            >
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Определить с помощью ИИ
            </Button>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать заявку'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TicketFormDialog