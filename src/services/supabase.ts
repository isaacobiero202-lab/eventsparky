import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// We export 'isSupabaseConfigured' as a let so that it can be dynamically flipped
export let isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Dynamic client reference
let activeClient: any = null;

if (isSupabaseConfigured) {
  try {
    activeClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize static Supabase client:', err);
    isSupabaseConfigured = false;
  }
}

// ====================================================================
// MOCK CLIENT DEFINITIONS (Fallback when Supabase keys are missing)
// ====================================================================

class MockQueryBuilder {
  table: string;
  filters: Array<(item: any) => boolean> = [];
  orderCol: string | null = null;
  ascending = true;
  isSingle = false;
  isMaybe = false;

  constructor(table: string) {
    this.table = table;
    // Auto-seed table records if none exist in localStorage
    if (!localStorage.getItem(`mock_${table}`)) {
      this.seedData();
    }
  }

  seedData() {
    if (this.table === 'profiles') {
      const defaultProfiles = [
        {
          id: 'mock-organizer-1',
          email: 'jane.doe@eventspark.com',
          full_name: 'Jane Doe (Organizer)',
          role: 'organizer',
          avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-attendee-1',
          email: 'user@eventspark.com',
          full_name: 'John Doe',
          role: 'attendee',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('mock_profiles', JSON.stringify(defaultProfiles));
    } else if (this.table === 'events') {
      const defaultEvents = [
        {
          id: 'mock-event-1',
          organizer_id: 'mock-organizer-1',
          title: 'Silicon Valley AI Summit',
          description: 'Join industry heads, engineers, and researchers for a fully interactive summit exploring the next generation of generative foundational models, secure enterprise pipelines, and interactive agent loops. Meet-ups and Q&A sessions are included.',
          event_date: new Date(Date.now() + 86450000 * 5).toISOString(),
          location: 'San Francisco Innovation Center, CA',
          price: 199,
          capacity: 150,
          image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-event-2',
          organizer_id: 'mock-organizer-1',
          title: 'Urban Rooftop Gardening',
          description: 'Learn urban agriculture techniques from hands-on sessions. We cover soil formulation, microgreens, rooftop engineering, and smart harvesting techniques for small city outdoor spaces.',
          event_date: new Date(Date.now() + 86400000 * 12).toISOString(),
          location: 'GreenRoof Community Space, Brooklyn NY',
          price: 45,
          capacity: 25,
          image_url: 'https://images.unsplash.com/photo-1530633767186-65094fc6e1dc?w=1200&q=80',
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-event-3',
          organizer_id: 'mock-organizer-1',
          title: 'Sunset Acoustic Concert',
          description: 'A melodic seaside evening with acoustic sets, artisan local wines, and bonfire networking. Experience pure creative acoustic expression under beautiful sunset backdrops.',
          event_date: new Date(Date.now() - 86400000 * 3).toISOString(), // Past event
          location: 'Malibu Coastal Cove, CA',
          price: 0,
          capacity: 50,
          image_url: 'https://images.unsplash.com/photo-1501281658745-f7f57925c3b4?w=1200&q=80',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('mock_events', JSON.stringify(defaultEvents));
    } else if (this.table === 'registrations') {
      const defaultRegs: any[] = [
        {
          id: 'mock-reg-1',
          event_id: 'mock-event-1',
          user_id: 'mock-attendee-1',
          status: 'registered',
          registered_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('mock_registrations', JSON.stringify(defaultRegs));
    } else if (this.table === 'feedback') {
      const defaultFeedback: any[] = [];
      localStorage.setItem('mock_feedback', JSON.stringify(defaultFeedback));
    }
  }

  getData() {
    return JSON.parse(localStorage.getItem(`mock_${this.table}`) || '[]');
  }

  setData(data: any) {
    localStorage.setItem(`mock_${this.table}`, JSON.stringify(data));
  }

  select(selectStr?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item: any) => item[column] === value);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((item: any) => {
      if (!item[column]) return false;
      return item[column] >= value;
    });
    return this;
  }

  or(filterStr: string) {
    const parts = filterStr.split(',');
    this.filters.push((item: any) => {
      return parts.some((p: string) => {
        const subparts = p.split('.');
        const col = subparts[0];
        const valWithPercent = subparts[2];
        if (!col || !valWithPercent) return false;
        const val = valWithPercent.replace(/%/g, '').toLowerCase();
        return String(item[col] || '').toLowerCase().includes(val);
      });
    });
    return this;
  }

  order(column: string, config?: { ascending: boolean }) {
    this.orderCol = column;
    this.ascending = config?.ascending ?? true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybe = true;
    return this;
  }

  // Promise support
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      let data = this.getData();

      // Apply filters
      for (const filter of this.filters) {
        data = data.filter(filter);
      }

      // Apply sorting
      if (this.orderCol) {
        const col = this.orderCol;
        data.sort((a: any, b: any) => {
          const valA = a[col];
          const valB = b[col];
          if (valA < valB) return this.ascending ? -1 : 1;
          if (valA > valB) return this.ascending ? 1 : -1;
          return 0;
        });
      }

      // Populate joined fields
      if (this.table === 'events') {
        const profilesList = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        const registrationsList = JSON.parse(localStorage.getItem('mock_registrations') || '[]');
        data = data.map((evt: any) => {
          const organizer = profilesList.find((p: any) => p.id === evt.organizer_id) || null;
          const regsForThisEvent = registrationsList.filter((r: any) => r.event_id === evt.id) || [];
          return {
            ...evt,
            organizer,
            registrations: regsForThisEvent
          };
        });
      }

      if (this.table === 'registrations') {
        const eventsList = JSON.parse(localStorage.getItem('mock_events') || '[]');
        const profilesList = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        data = data.map((reg: any) => {
          const evt = eventsList.find((e: any) => e.id === reg.event_id);
          const organizer = evt ? profilesList.find((p: any) => p.id === evt.organizer_id) : null;
          const user_profile = profilesList.find((p: any) => p.id === reg.user_id) || null;
          return {
            ...reg,
            event: evt ? { ...evt, organizer } : null,
            user_profile
          };
        });
      }

      if (this.table === 'feedback') {
        const profilesList = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        data = data.map((fb: any) => {
          const user_profile = profilesList.find((p: any) => p.id === fb.user_id) || null;
          return {
            ...fb,
            user_profile
          };
        });
      }

      let result: any = data;
      if (this.isSingle) {
        result = data[0] || null;
        if (!result) {
          throw new Error('Item not found in database');
        }
      } else if (this.isMaybe) {
        result = data[0] || null;
      }

      const val = { data: result, error: null };
      if (onfulfilled) {
        return Promise.resolve(onfulfilled(val));
      }
      return val;
    } catch (err: any) {
      const val = { data: null, error: err };
      if (onrejected) {
        return Promise.resolve(onrejected(val));
      }
      return val;
    }
  }

  // Insert Record
  async insert(record: any) {
    const list = this.getData();
    const records = Array.isArray(record) ? record : [record];
    const inserted: any[] = [];

    for (const rec of records) {
      const newRec = {
        id: rec.id || 'mock-' + Math.random().toString(36).substring(2),
        created_at: new Date().toISOString(),
        ...rec
      };
      list.push(newRec);
      inserted.push(newRec);
    }
    this.setData(list);

    const selectBuilder = new MockQueryBuilder(this.table);
    selectBuilder.filters = [ (item: any) => inserted.some(ins => ins.id === item.id) ];
    return selectBuilder;
  }

  // Update Record
  async update(updates: any) {
    const list = this.getData();
    const self = this;
    
    // We intercept then to apply updates
    this.then = async (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
      try {
        let itemsToUpdate = list;
        for (const filter of self.filters) {
          itemsToUpdate = itemsToUpdate.filter(filter);
        }

        const updatedIds = itemsToUpdate.map((i: any) => i.id);
        const newList = list.map((item: any) => {
          if (updatedIds.includes(item.id)) {
            return { ...item, ...updates };
          }
          return item;
        });
        self.setData(newList);

        const freshBuilder = new MockQueryBuilder(self.table);
        freshBuilder.filters = [ (item: any) => updatedIds.includes(item.id) ];
        if (self.isSingle) {
          freshBuilder.isSingle = true;
        } else if (self.isMaybe) {
          freshBuilder.isMaybe = true;
        }
        return freshBuilder.then(onfulfilled, onrejected);
      } catch (err) {
        if (onrejected) return onrejected(err);
        return { data: null, error: err };
      }
    };

    return this;
  }

  // Delete Record
  async delete() {
    const list = this.getData();
    const self = this;

    this.then = async (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
      try {
        let itemsToDelete = list;
        for (const filter of self.filters) {
          itemsToDelete = itemsToDelete.filter(filter);
        }

        const deleteIds = itemsToDelete.map((i: any) => i.id);
        const newList = list.filter((item: any) => !deleteIds.includes(item.id));
        self.setData(newList);

        const val = { data: null, error: null };
        if (onfulfilled) return onfulfilled(val);
        return val;
      } catch (err) {
        if (onrejected) return onrejected(err);
        return { data: null, error: err };
      }
    };

    return this;
  }

  // Upsert Record
  async upsert(record: any, options?: { onConflict: string }) {
    const list = this.getData();
    const records = Array.isArray(record) ? record : [record];
    const finalInserted: any[] = [];

    const conflictCols = options?.onConflict ? options.onConflict.split(',') : ['id'];

    for (const rec of records) {
      const matchIndex = list.findIndex((item: any) => {
        return conflictCols.every(col => item[col] === rec[col]);
      });

      if (matchIndex >= 0) {
        list[matchIndex] = { ...list[matchIndex], ...rec };
        finalInserted.push(list[matchIndex]);
      } else {
        const newRec = {
          id: rec.id || 'mock-' + Math.random().toString(36).substring(2),
          created_at: new Date().toISOString(),
          ...rec
        };
        list.push(newRec);
        finalInserted.push(newRec);
      }
    }

    this.setData(list);

    const selectBuilder = new MockQueryBuilder(this.table);
    selectBuilder.filters = [ (item: any) => finalInserted.some(ins => ins.id === item.id) ];
    return selectBuilder;
  }
}

class MockSupabaseClient {
  auth = {
    async getSession() {
      const user = JSON.parse(localStorage.getItem('mock_user') || 'null');
      return { data: { session: user ? { user } : null }, error: null };
    },
    onAuthStateChange(callback: any) {
      const handler = () => {
        const user = JSON.parse(localStorage.getItem('mock_user') || 'null');
        callback('SIGNED_IN', user ? { user } : null);
      };
      window.addEventListener('mock-auth-change', handler);
      // Trigger once on startup
      setTimeout(handler, 10);
      return {
        data: {
          subscription: {
            unsubscribe() {
              window.removeEventListener('mock-auth-change', handler);
            }
          }
        }
      };
    },
    async signInWithPassword({ email }: { email: string }) {
      const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
      let profile = profiles.find((p: any) => p.email === email);
      if (!profile) {
        profile = {
          id: 'mock-user-' + Math.random().toString(36).substring(2),
          email,
          full_name: email.split('@')[0],
          role: 'organizer',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
          created_at: new Date().toISOString()
        };
        profiles.push(profile);
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));
      }
      const user = { id: profile.id, email, user_metadata: { full_name: profile.full_name, role: profile.role } };
      localStorage.setItem('mock_user', JSON.stringify(user));
      window.dispatchEvent(new Event('mock-auth-change'));
      return { data: { user, session: { user } }, error: null };
    },
    async signUp({ email, options }: { email: string; options?: any }) {
      const role = options?.data?.role || 'attendee';
      const fullName = options?.data?.full_name || 'Spark User';
      const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
      const id = 'mock-user-' + Math.random().toString(36).substring(2);
      const profile = {
        id,
        email,
        full_name: fullName,
        role,
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
        created_at: new Date().toISOString()
      };
      profiles.push(profile);
      localStorage.setItem('mock_profiles', JSON.stringify(profiles));
      
      const user = { id, email, user_metadata: { full_name: fullName, role } };
      localStorage.setItem('mock_user', JSON.stringify(user));
      window.dispatchEvent(new Event('mock-auth-change'));
      return { data: { user, session: { user } }, error: null };
    },
    async signOut() {
      localStorage.removeItem('mock_user');
      window.dispatchEvent(new Event('mock-auth-change'));
      return { error: null };
    },
    async resetPasswordForEmail() {
      return { error: null };
    }
  };

  from(table: string) {
    return new MockQueryBuilder(table);
  }

  storage = {
    from(bucket: string) {
      return {
        async upload(filePath: string, file: File) {
          return { data: { path: filePath }, error: null };
        },
        getPublicUrl(filePath: string) {
          let url = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';
          if (filePath.includes('profiles') || bucket === 'avatars') {
            url = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80';
          }
          return { data: { publicUrl: url } };
        }
      };
    }
  };
}

// Define mock client fallback instance
const mockClientFallback = new MockSupabaseClient() as any;

// Helper to dynamically set or confirm connection credentials
export function setSupabaseConfig(url: string, key: string) {
  if (url && key) {
    try {
      activeClient = createClient(url, key);
      isSupabaseConfigured = true;
      console.log('[Supabase] Successfully connected to dynamic live database!');
      return true;
    } catch (err) {
      console.error('[Supabase] Dynamic connection failed:', err);
    }
  }
  return false;
}

class FluentChain {
  steps: Array<{ type: 'get' | 'apply'; prop?: string | symbol; args?: any[] }> = [];

  clone() {
    const next = new FluentChain();
    next.steps = [...this.steps];
    return next;
  }

  addGet(prop: string | symbol) {
    this.steps.push({ type: 'get', prop });
  }

  addApply(args: any[]) {
    this.steps.push({ type: 'apply', args });
  }

  execute(base: any) {
    let current = base;
    for (const step of this.steps) {
      if (!current) break;
      if (step.type === 'get') {
        current = current[step.prop!];
      } else if (step.type === 'apply') {
        if (typeof current === 'function') {
          current = current(...step.args!);
        }
      }
    }
    return current;
  }
}

const UUID_COLUMNS = ['id', 'user_id', 'event_id', 'organizer_id'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DUMMY_UUID = '00000000-0000-0000-0000-000000000000';

function isInvalidUuid(val: any): boolean {
  if (typeof val === 'string') {
    return !UUID_REGEX.test(val);
  }
  return false;
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  if (typeof obj === 'object') {
    const newObj = { ...obj };
    for (const key of Object.keys(newObj)) {
      if (UUID_COLUMNS.includes(key.toLowerCase())) {
        const val = newObj[key];
        if (isInvalidUuid(val)) {
          newObj[key] = DUMMY_UUID;
        }
      }
    }
    return newObj;
  }
  return obj;
}

function sanitizeArgs(prop: string | symbol, args: any[]): any[] {
  if (typeof prop !== 'string') return args;
  
  const filterMethods = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];
  if (filterMethods.includes(prop) && args.length >= 2) {
    const [column, value] = args;
    if (typeof column === 'string' && UUID_COLUMNS.includes(column.toLowerCase())) {
      if (isInvalidUuid(value)) {
        const sanitizedArgs = [...args];
        sanitizedArgs[1] = DUMMY_UUID;
        return sanitizedArgs;
      }
    }
  } else if (prop === 'in' && args.length >= 2) {
    const [column, values] = args;
    if (typeof column === 'string' && UUID_COLUMNS.includes(column.toLowerCase()) && Array.isArray(values)) {
      const sanitizedValues = values.map(v => isInvalidUuid(v) ? DUMMY_UUID : v);
      const sanitizedArgs = [...args];
      sanitizedArgs[1] = sanitizedValues;
      return sanitizedArgs;
    }
  } else if (['insert', 'update', 'upsert'].includes(prop) && args.length >= 1) {
    const sanitizedArgs = [...args];
    sanitizedArgs[0] = sanitizeObject(args[0]);
    return sanitizedArgs;
  }
  return args;
}

function makeSafeProxy(realObj: any, fallbackObj: any, chain: FluentChain = new FluentChain()): any {
  if (realObj === null || realObj === undefined) {
    return realObj;
  }

  return new Proxy(realObj, {
    get(target, prop) {
      // Handle promise resolution via thenable interface
      if (prop === 'then') {
        return function(onfulfilled: any, onrejected: any) {
          return Promise.resolve(realObj).then(
            (val) => {
              if (onfulfilled) return onfulfilled(val);
              return val;
            },
            async (err) => {
              const errMsg = String(err?.message || err || '');
              if (
                errMsg.includes('fetch') ||
                errMsg.includes('TypeError') ||
                errMsg.includes('Failed to fetch') ||
                errMsg.includes('NetworkError') ||
                errMsg.includes('network') ||
                errMsg.includes('Failed to execute')
              ) {
                console.warn('[Supabase] Live database query failed due to fetch/network error. Seamlessly switching to local mockup mode:', errMsg);
                activeClient = null; // Globally disable activeClient so subsequent calls directly call mock storage
                isSupabaseConfigured = false;

                try {
                  const mockResult = await chain.execute(mockClientFallback);
                  if (onfulfilled) return onfulfilled(mockResult);
                  return mockResult;
                } catch (mockErr) {
                  if (onrejected) return onrejected(mockErr);
                  throw mockErr;
                }
              }
              if (onrejected) return onrejected(err);
              throw err;
            }
          );
        };
      }

      const nextReal = realObj[prop];
      const nextFallback = fallbackObj ? fallbackObj[prop] : null;

      const nextChain = chain.clone();
      nextChain.addGet(prop);

      if (typeof nextReal === 'function') {
        return function(...args: any[]) {
          const sanitizedArgs = sanitizeArgs(prop, args);
          const boundReal = nextReal.bind(realObj);
          const boundFallback = typeof nextFallback === 'function' ? nextFallback.bind(fallbackObj) : nextFallback;

          const resReal = boundReal(...sanitizedArgs);
          const resFallback = typeof boundFallback === 'function' ? boundFallback(...args) : boundFallback;

          const nextChainCall = nextChain.clone();
          nextChainCall.addApply(sanitizedArgs);

          return makeSafeProxy(resReal, resFallback, nextChainCall);
        };
      }

      if (typeof nextReal === 'object' && nextReal !== null) {
        return makeSafeProxy(nextReal, nextFallback, nextChain);
      }

      return nextReal;
    }
  });
}

// Export the dynamic proxied client
export const supabase = new Proxy({}, {
  get(target, prop) {
    const current = activeClient || mockClientFallback;
    const value = current[prop];

    // If activeClient is live, let's wrap it in our safe fallback proxy
    if (activeClient) {
      const fallbackValue = mockClientFallback[prop];
      const chain = new FluentChain();
      chain.addGet(prop);

      if (typeof value === 'function') {
        return function(...args: any[]) {
          const sanitizedArgs = sanitizeArgs(prop, args);
          const resReal = value.bind(activeClient)(...sanitizedArgs);
          const resFallback = typeof fallbackValue === 'function' ? fallbackValue.bind(mockClientFallback)(...args) : fallbackValue;
          
          const callChain = chain.clone();
          callChain.addApply(sanitizedArgs);
          return makeSafeProxy(resReal, resFallback, callChain);
        };
      }

      if (typeof value === 'object' && value !== null) {
        return makeSafeProxy(value, fallbackValue, chain);
      }

      return value;
    }

    // Otherwise, directly run off the mock client
    if (typeof value === 'function') {
      return value.bind(mockClientFallback);
    }
    return value;
  }
}) as any;
