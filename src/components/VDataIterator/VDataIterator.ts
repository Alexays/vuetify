import Vue, { VNode, CreateElement, VNodeChildren, VNodeChildrenArrayContents } from 'vue'
import { PropValidator } from 'vue/types/options'

import { getObjectValueByPath } from '../../util/helpers'

function wrapInArray<T> (v: T | Array<T>): Array<T> { return Array.isArray(v) ? v : [v] }

type BooleanMap = {
  [key: string]: boolean
}

export default Vue.extend({
  name: 'v-data-iterator',

  provide (): any {
    const dataIterator = {
      toggleSelected: this.toggleSelected,
      resetExpanded: this.resetExpanded,
      sort: this.sort
    }

    Object.defineProperty(dataIterator, 'items', {
      get: () => this.computedItems
    })

    Object.defineProperty(dataIterator, 'page', {
      get: () => this.options.page,
      set: v => this.options.page = v,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'rowsPerPage', {
      get: () => this.options.rowsPerPage,
      set: v => this.options.rowsPerPage = v,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'pageCount', {
      get: () => this.pageCount,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'pageStart', {
      get: () => this.pageStart,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'pageStop', {
      get: () => this.pageStop,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'itemsLength', {
      get: () => this.itemsLength,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'everyItem', {
      get: () => this.everyItem,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'someItems', {
      get: () => this.someItems,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'sortBy', {
      get: () => this.options.sortBy,
      set: v => this.options.sortBy = v,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'sortDesc', {
      get: () => this.options.sortDesc,
      set: v => this.options.sortDesc = v,
      enumerable: true
    })

    Object.defineProperty(dataIterator, 'multiSort', {
      get: () => this.multiSort,
      enumerable: true
    })

    return { dataIterator }
  },

  props: {
    items: Array as PropValidator<any[]>,
    itemKey: {
      type: String
    },
    customSort: {
      type: Function,
      default: (items: any[], sortBy: string[], sortDesc: boolean[]) => {
        if (sortBy === null) return items

        return items.sort((a: any, b: any): number => {
          for (let i = 0; i < sortBy.length; i++) {
            const sortKey = sortBy[i]

            let sortA = getObjectValueByPath(a, sortKey)
            let sortB = getObjectValueByPath(b, sortKey)

            if (sortDesc[i]) {
              [sortA, sortB] = [sortB, sortA]
            }

            // Check if both cannot be evaluated
            if (sortA === null && sortB === null) {
              return 0
            }

            [sortA, sortB] = [sortA, sortB].map(s => (s || '').toString().toLocaleLowerCase())

            if (sortA !== sortB) {
              if (!isNaN(sortA) && !isNaN(sortB)) return Number(sortA) - Number(sortB)
              if (sortA > sortB) return 1
              if (sortA < sortB) return -1
            }
          }

          return 0
        })
      }
    },
    // TODO: should probably not combine customFilter and filter
    // but having both of them is confusing and overly complex.
    // Also should we do built-in column filter in headers?
    customFilter: {
      type: Function,
      default: (items: any[], search: string) => {
        search = search.toString().toLowerCase()
        if (search.trim() === '') return items

        return items.filter(i => Object.keys(i).some(j => {
          const val = i[j]
          return val != null &&
            typeof val !== 'boolean' &&
            val.toString().toLowerCase().indexOf(search) !== -1
        }))
      }
    },
    search: {
      type: String
    },
    sortBy: {
      type: [String, Array],
      default: () => ([])
    } as PropValidator<string | string[]>,
    sortDesc: {
      type: [Boolean, Array],
      default: () => ([])
    } as PropValidator<boolean | boolean[]>,
    rowsPerPage: {
      type: Number,
      default: 10
    },
    page: {
      type: Number,
      default: 1
    },
    serverItemsLength: {
      type: Number
    },
    noResultsText: {
      type: String,
      default: '$vuetify.dataIterator.noResultsText'
    },
    noDataText: {
      type: String,
      default: '$vuetify.noDataText'
    },
    loading: Boolean,
    loadingText: {
      type: String,
      default: '$vuetify.dataIterator.loadingText'
    },
    multiSort: {
      type: Boolean
    },
    mustSort: {
      type: Boolean
    },
    rowsPerPageItems: {
      type: Array,
      default: () => ([
        { text: '5', value: 5 },
        { text: '10', value: 10 },
        { text: '15', value: 15 },
        { text: 'All', value: -1 }
      ])
    } as PropValidator<any[]>
  },

  data () {
    return {
      searchItemsLength: 0,
      selection: {} as BooleanMap,
      expansion: {} as BooleanMap,
      options: {
        sortBy: wrapInArray(this.sortBy),
        sortDesc: wrapInArray(this.sortDesc),
        rowsPerPage: this.rowsPerPage,
        page: this.page
      }
    }
  },

  watch: {
    // eslint-disable-next-line object-shorthand
    'options.sortBy': function (v) {
      this.$emit('update:sortBy', !this.multiSort && !Array.isArray(this.sortBy) ? v[0] : v)
    },
    // eslint-disable-next-line object-shorthand
    'options.sortDesc': function (v) {
      this.$emit('update:sortDesc', !this.multiSort && !Array.isArray(this.sortBy) ? v[0] : v)
    },
    // eslint-disable-next-line object-shorthand
    'options.page': function (v) {
      this.$emit('update:page', v)
    },
    // eslint-disable-next-line object-shorthand
    'options.rowsPerPage': function (v) {
      this.$emit('update:rowsPerPage', v)
    },
    sortBy (v) {
      this.options.sortBy = wrapInArray(v)
    },
    sortDesc (v) {
      this.options.sortDesc = wrapInArray(v)
    },
    page (v) {
      this.options.page = v
    },
    rowsPerPage (v) {
      this.options.rowsPerPage = v
    }
  },

  computed: {
    hasSearch (): boolean {
      return typeof this.search !== 'undefined' && this.search !== null
    },
    computedItems (): any[] {
      let items = this.items.slice()

      if (this.serverItemsLength) return items

      items = this.searchItems(items)

      items = this.sortItems(items, this.options.sortBy, this.options.sortDesc)

      return this.paginateItems(items)
    },
    pageStart (): number {
      return this.options.rowsPerPage === -1
        ? 0
        : (this.options.page - 1) * this.options.rowsPerPage
    },
    pageStop (): number {
      return this.options.rowsPerPage === -1
        ? this.itemsLength // TODO: Does this need to be something other (server-side, etc?)
        : this.options.page * this.options.rowsPerPage
    },
    pageCount (): number {
      // We can't simply use computedItems.length here since it's already sliced
      return this.options.rowsPerPage <= 0 ? 1 : Math.ceil(this.itemsLength / this.options.rowsPerPage)
    },
    itemsLength (): number {
      if (typeof this.serverItemsLength !== 'undefined' && !isNaN(this.serverItemsLength)) return this.serverItemsLength
      if (this.hasSearch) return this.searchItemsLength
      return this.items.length
    },
    everyItem (): boolean {
      return !!this.computedItems.length && this.computedItems.every((i: any) => this.isSelected(i))
    },
    someItems (): boolean {
      return this.computedItems.some((i: any) => this.isSelected(i))
    }
  },

  methods: {
    sortItems (items: any[], sortBy: string[], sortDesc: boolean[]): any[] {
      return this.customSort(items, sortBy, sortDesc)
    },
    paginateItems (items: any[]): any[] {
      return items.slice(this.pageStart, this.pageStop)
    },
    searchItems (items: any[]): any[] {
      if (this.hasSearch) {
        items = this.customFilter(items, this.search)
        this.searchItemsLength = items.length
      }

      return items
    },
    sort (key: string): void {
      let sortBy = this.options.sortBy.slice()
      let sortDesc = this.options.sortDesc.slice()
      const sortByIndex = sortBy.findIndex((k: string) => k === key)

      if (sortByIndex < 0) {
        if (!this.multiSort) {
          sortBy = []
          sortDesc = []
        }
        sortBy.push(key)
        sortDesc.push(false)
      } else if (sortByIndex >= 0 && !sortDesc[sortByIndex]) {
        sortDesc[sortByIndex] = true
      } else if (!this.mustSort) {
        sortBy.splice(sortByIndex, 1)
        sortDesc.splice(sortByIndex, 1)
      } else {
        sortDesc[sortByIndex] = false
      }

      this.options = Object.assign(this.options, { sortBy, sortDesc })
    },
    isSelected (item: any): boolean {
      return this.selection[item[this.itemKey]]
    },
    select (item: any, value = true): void {
      this.$set(this.selection, item[this.itemKey], value)
    },
    isExpanded (item: any): boolean {
      return this.expansion[item[this.itemKey]]
    },
    expand (item: any, value = true): void {
      this.$set(this.expansion, item[this.itemKey], value)
    },
    resetExpanded (): void {
      this.expansion = {}
    },
    toggleSelected (): void {
      const selection: BooleanMap = {}

      this.computedItems.forEach((item: any) => {
        const value = item[this.itemKey]
        selection[value] = !this.everyItem
      })

      this.selection = Object.assign({}, this.selection, selection)
    },
    createItemProps (item: any): any {
      const props = {
        item
      }

      Object.defineProperty(props, 'selected', {
        get: () => this.isSelected(item),
        set: v => this.select(item, v),
        enumerable: true
      })

      Object.defineProperty(props, 'expanded', {
        get: () => this.isExpanded(item),
        set: v => this.expand(item, v),
        enumerable: true
      })

      return props
    },
    computeSlots (name: string): VNodeChildrenArrayContents {
      const slots: VNodeChildrenArrayContents = []

      if (this.$slots[name]) slots.push(...this.$slots[name])
      if (this.$scopedSlots[name]) {
        const scoped = this.$scopedSlots[name]((this as any)._provided.dataIterator) // TODO: type _provided somehow?
        Array.isArray(scoped) ? slots.push(...scoped) : slots.push(scoped)
      }

      return slots
    },
    genHeaders (h: CreateElement): VNodeChildrenArrayContents {
      return this.computeSlots('header')
    },
    genEmpty (h: CreateElement, content: any) {
      return h('div', content)
    },
    genBodies (h: CreateElement): VNodeChildrenArrayContents {
      const bodies: VNodeChildrenArrayContents = []
      if (!this.serverItemsLength && this.loading) {
        const loading = this.$slots['loading'] || this.$vuetify.t(this.loadingText)
        return [this.genEmpty(h, loading)]
      } else if (!this.itemsLength && !this.items.length) {
        const noData = this.$slots['no-data'] || this.$vuetify.t(this.noDataText)
        return [this.genEmpty(h, noData)]
      } else if (!this.computedItems.length) {
        const noResults = this.$slots['no-results'] || this.$vuetify.t(this.noResultsText)
        return [this.genEmpty(h, noResults)]
      }

      bodies.push(this.$slots.default)
      bodies.push(...this.computeSlots('body'))
      bodies.push(...this.genItems(h))

      return bodies
    },
    genItems (h: CreateElement): VNodeChildrenArrayContents {
      const items: VNodeChildrenArrayContents = []

      if (this.$scopedSlots.item) {
        const slotItems = this.computedItems.map((item: any) => this.$scopedSlots.item(this.createItemProps(item)))
        items.push(this.genBodyWrapper(h, slotItems))
      }

      return items
    },
    genFooters (h: CreateElement): VNodeChildrenArrayContents {
      return this.computeSlots('footer')
    },
    genBodyWrapper (h: CreateElement, items: any[]): VNode {
      return h('div', items)
    }
  },

  render (h): VNode {
    const children: VNodeChildrenArrayContents = [
      ...this.genHeaders(h),
      ...this.genBodies(h),
      ...this.genFooters(h)
    ]

    return h('div', {
      staticClass: 'v-data-iterator'
    }, children)
  }
})