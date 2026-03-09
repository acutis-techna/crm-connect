
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's account_id
CREATE OR REPLACE FUNCTION public.get_user_account_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Organizations
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Contacts
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Pipelines
CREATE TABLE public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Stages
CREATE TABLE public.stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  probability INTEGER DEFAULT 0
);
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

-- Deals
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activities
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'task')),
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Webhooks
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies using security definer function

-- Accounts: users can only see their own account
CREATE POLICY "Users can view own account" ON public.accounts
  FOR SELECT USING (id = public.get_user_account_id(auth.uid()));

-- Profiles
CREATE POLICY "Users can view profiles in same account" ON public.profiles
  FOR SELECT USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Organizations
CREATE POLICY "Users can view own account orgs" ON public.organizations
  FOR SELECT USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can create orgs" ON public.organizations
  FOR INSERT WITH CHECK (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can update own account orgs" ON public.organizations
  FOR UPDATE USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can delete own account orgs" ON public.organizations
  FOR DELETE USING (account_id = public.get_user_account_id(auth.uid()));

-- Contacts
CREATE POLICY "Users can view own account contacts" ON public.contacts
  FOR SELECT USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can create contacts" ON public.contacts
  FOR INSERT WITH CHECK (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can update contacts" ON public.contacts
  FOR UPDATE USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can delete contacts" ON public.contacts
  FOR DELETE USING (account_id = public.get_user_account_id(auth.uid()));

-- Pipelines
CREATE POLICY "Users can view own account pipelines" ON public.pipelines
  FOR SELECT USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can create pipelines" ON public.pipelines
  FOR INSERT WITH CHECK (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can update pipelines" ON public.pipelines
  FOR UPDATE USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can delete pipelines" ON public.pipelines
  FOR DELETE USING (account_id = public.get_user_account_id(auth.uid()));

-- Stages (via pipeline's account)
CREATE POLICY "Users can view stages" ON public.stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pipelines p 
      WHERE p.id = pipeline_id 
      AND p.account_id = public.get_user_account_id(auth.uid())
    )
  );
CREATE POLICY "Users can create stages" ON public.stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pipelines p 
      WHERE p.id = pipeline_id 
      AND p.account_id = public.get_user_account_id(auth.uid())
    )
  );
CREATE POLICY "Users can update stages" ON public.stages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pipelines p 
      WHERE p.id = pipeline_id 
      AND p.account_id = public.get_user_account_id(auth.uid())
    )
  );
CREATE POLICY "Users can delete stages" ON public.stages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pipelines p 
      WHERE p.id = pipeline_id 
      AND p.account_id = public.get_user_account_id(auth.uid())
    )
  );

-- Deals
CREATE POLICY "Users can view own account deals" ON public.deals
  FOR SELECT USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can create deals" ON public.deals
  FOR INSERT WITH CHECK (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can update deals" ON public.deals
  FOR UPDATE USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can delete deals" ON public.deals
  FOR DELETE USING (account_id = public.get_user_account_id(auth.uid()));

-- Activities
CREATE POLICY "Users can view own account activities" ON public.activities
  FOR SELECT USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT WITH CHECK (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can update activities" ON public.activities
  FOR UPDATE USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can delete activities" ON public.activities
  FOR DELETE USING (account_id = public.get_user_account_id(auth.uid()));

-- Webhooks
CREATE POLICY "Users can view own account webhooks" ON public.webhooks
  FOR SELECT USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can create webhooks" ON public.webhooks
  FOR INSERT WITH CHECK (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can update webhooks" ON public.webhooks
  FOR UPDATE USING (account_id = public.get_user_account_id(auth.uid()));
CREATE POLICY "Users can delete webhooks" ON public.webhooks
  FOR DELETE USING (account_id = public.get_user_account_id(auth.uid()));

-- Trigger to auto-create account and profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id UUID;
BEGIN
  INSERT INTO public.accounts (name) VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'))
  RETURNING id INTO new_account_id;
  
  INSERT INTO public.profiles (user_id, account_id, name, email)
  VALUES (NEW.id, new_account_id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  
  -- Create default pipeline
  INSERT INTO public.pipelines (account_id, name) VALUES (new_account_id, 'Sales Pipeline');
  
  -- Create default stages
  INSERT INTO public.stages (pipeline_id, name, position, probability)
  SELECT p.id, s.name, s.position, s.probability
  FROM public.pipelines p,
  (VALUES 
    ('Lead', 0, 10),
    ('Contacted', 1, 20),
    ('Proposal Sent', 2, 40),
    ('Negotiation', 3, 60),
    ('Won', 4, 100),
    ('Lost', 5, 0)
  ) AS s(name, position, probability)
  WHERE p.account_id = new_account_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
