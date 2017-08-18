---
layout: post
title:  "Riak and Elixir"
date:   2017-08-17 20:35:11
type:   primary
---

### Using Riak with Elixir

Now that [Basho](http://basho.com) is no more, people have been asking what
will happen to Riak.  Now I don't presume to know but I will say that it is an
OSS project and that there are several engineers which continue to work with it
while some are willing to be paid to support it.  (Disclaimer, I am one).

The [Basho Docs](http://docs.basho.com) may (or may not) still be alive when
you read this.  Although the community has suffered some blows over the years
it still exists and at least one person has decided to host the docs at a
[alternative location](https://www.tiot.jp/riak-docs).  With anything OSS life
is uncertain.  This is why it is important to make sure that people who work on
something get paid if what they work on is of value to you.  This article isn't
about economics or markets however.  I'd like to write about using Riak with
Elixir today.

Using Riak within an Elixir project is super easy but occasionally I bump
into dependencies which are not updated or have warnings I'd rather not live
with.  I recently ran into a few of those and I expect until someone decides to
come along and fund Riak work then things may continue to break.  Although Riak
has built in anti-entropy it wasn't built to maintain itself against code rot as
OTP releases march forward.

I recently took a few hours and updated the
[Elixir Riak Client](https://github.com/drewkerrigan/riak-elixir-client) and
[Pooler](https://github.com/seth/pooler) and pushed them up to
[hex.pm](https://hex.pm/packages/riak).  This adds [Hyper Log Log](http://basho.com/posts/technical/what-in-the-hell-is-hyperloglog) support
in the Elixir client and fixes some issues with pooler which were preventing
compilation under under OTP 20.

While I am here, I will just quickly discuss setting up a Mix project to work
with Riak.  Having worked on many consulting projects using Riak I have found
that there are several things I desire when working with Riak on a long term
basis.

#### Integrating Riak into Mix

I prefer to create a umbrella OTP app called ***db***.  I do this because I want
to group up all the data models which will be stored to Riak.  I also want to
have a nice dedicated place to add the dependency information which only directly
relevant to KV storage.

In my mix file, I add this to get started:

{% highlight elixir %}
def application do
  [
    applications: [
      :logger,
      :tzdata,
      :riak],
      mod: {DB, []}
  ]
end

defp deps do
  [
    {:tzdata, "~> 0.5.12"},
    {:geocalc, "~> 0.5.4"},
    {:riak, "~> 1.1.6"},
    {:timex, "~> 3.1"},
    {:pbkdf2, "~> 2.0.0"},
    {:csv, "~> 2.0.0"},
    {:uuid, github: "okeuday/uuid"}
  ]
end
{% endhighlight %}

These libraries are fairly common across several use cases I have bumped up into
in the wild.  This also starts up the DB application.

#### Environment Namespaceing

Separating configuration by environment is really good to do from the get go.
It makes sure that any development, test, or production data are logically and
cleanly separated from each other within Riak.  You will see later that I will
tie the `Mix.env` variable as my Riak bucket prefix.

Each OTP app has its own configuration file under ***config/config.exs***.  I
like to add a import for a mix environment specific file by adding this to that
file:

{% highlight elixir %}
import_config "#{Mix.env}.exs"
{% endhighlight %}

The overall (top level) umbrella application config file contains generic top
level application configuration for ssl, logging, timezone data storage, uuid
caching, etc.  I also add two lines at the bottom of the file which ensure that
local configuration will override any configuration settings defined elsewhere.
It is important that these go at the end of the file like so:

{% highlight elixir %}
config :ssl, protocol_version: :"tlsv1.2"

config :logger,
  backends: [
    {FileLoggerBackend, :error_log},
    {FileLoggerBackend, :access_log}],
  utc_log: true,
  compile_time_purge_level: :debug,
  truncate: 4096

config :logger, :access_log,
  path: System.cwd <> "/log/access.log",
  metadata: [:function, :module],
  level: :info

config :logger, :error_log,
  path: System.cwd <> "/log/error.log",
  metadata: [:function, :module],
  level: :error

# if a process decides to have a uuid cache
config :quickrand,
  cache_size: 65536

# prevent exometer from creating spurious directories
config :setup,
  verify_directories: false

# configure tzdata to autoupdate and use a data dir
config :tzdata, [
  autoupdate: :enabled,
  data_dir: "./data"]

import_config "../apps/*/config/config.exs"
import_config "*local.exs"
{% endhighlight %}

I use a [file logger backend](https://github.com/onkel-dirtus/logger_file_backend)
which I just found via google.  It is based off of GenEvent, and seems to work
ok.  I could probably dig into it to make it better or I could just try to
integrate [lager](https://github.com/erlang-lager/lager) some day if I can
figure out how not to drag in dependencies I may not want to have.  That could
be something to write about later.

Next up, lets configure the Riak connection pool.

Inside of apps/db/config/dev.exs we add

{% highlight elixir %}
config :db,
  unit_separator: "_"

config :pooler,
  [pools: [
    [name: :riaklocal1,
     group: :riak,
     max_count: 5,
     init_count: 2,
     start_mfa: {Riak.Connection, :start_link, ['127.0.0.1', 8087]}]
  ]]
{% endhighlight %}

Pooler can have more than one pool should you want to build in some redundancy.
For production you will probably have each pool point at a load balancer so only
one may be needed.  Take care with your HAProxy config, I've seen some
configurations disconnect clients at wrong intervals so getting the timeouts
wrong which will cause intermittent disconnects.

From that point on if network connectivity to the protocol buffers port in Riak
isn't a problem (all the ports are open) then you should be able to
just fire up iex to validate the connection to Riak:

{% highlight elixir %}
Riak.ping
{% endhighlight %}

For fun, go ahead and stop Riak.  Watch the logs.  Pooler will freak out and
start to watch for reconnection.  When you start Riak back up you will see it
calm down and return to normal operation.  This is what I love about erlang and
elixir, this stuff is usually built in to handle failures without crashing
everything.

From here, we just need to create a data model.

#### KV Data Models

Most of the database world thinks of data models as either chunks of tabular
data that can be joined and manipulated with SQL.  Riak is technically a
distributed Key-Value store so; no SQL for you.  So here is what we are going to
do.

Somewhere in a common module create a few attributes that look like this.

{% highlight elixir %}
@unit_separator Application.get_env(:db, :unit_separator, "\x1f")
@prefix "#{Mix.env}"
{% endhighlight %}

These make sure the prefix and unit separator is accessible in one spot to the
codebase.  I use `underscores` for dev and test, but `the unit separator
character (\x1f)` for prod.  I don't like it when someone tosses an underscore
into their keyspace and I have to deal with it in prod.  Since no one uses the
latter, it prevents a bunch of headaches down the road.  (I actually had a
difficult migration once because of this).

Next up, lets define what any code that touches a KV Data Model is going to
pass up the stack.  I want something from Riak (r) which can be turned into
JSON.  Here is the type spec I like:

{% highlight elixir %}
@type r_json_t :: %{
  required(model: atom) => map(),
  optional(vtag: atom) => String.t,
  optional(last_modify_time: atom) => DateTime.t,
  optional(vclock: atom) => String.t
}
{% endhighlight %}

A **model** is a kind of flat structure that can be stored as a value using a
key.  It is a map (actually a struct) which can be turned into a predefined
structure later.

{% highlight elixir %}
@spec unit_separator() :: String.t
def unit_separator do
  @unit_separator
end

@spec namespace(String.t) :: String.t
def namespace(bucket) do
  "#{@prefix}#{@unit_separator}#{bucket}"
end
{% endhighlight %}

This is where I allow other modules know about and understand both the separator
and prefix namespace strategy.  Sometimes it can be handy for data migrations to
get at this so Riak libraries can be called directly without all the convenience
functions found within the application.  If every data model uses this common
code then all data models will be appropriately by environment.

I like my data models to include some basic thing always.  This function makes
sure to translate last modify time to the `r_json_t` map.  For kicks it also
adds `vclock` and `vtag`.

Again ***type*** is a struct and [Poison](https://github.com/devinus/poison) is
used to decode riak object data into the ***r_json_t*** model.

{% highlight elixir %}
@spec add_db_attrs(%Riak.Object{}, map()) :: DB.Common.r_json_t
def add_db_attrs(%Riak.Object{} = r_object, type) do
  meta = r_object.metadata
  {_, vtag} = :dict.find("X-Riak-VTag", meta)
  {_, {mega,seconds,micro}} = :dict.find("X-Riak-Last-Modified", meta)
  unix = (mega * 1000000 + seconds) * 1000000 + micro
  {:ok, time} = DateTime.from_unix(unix, :microseconds)
  %{model: Poison.decode!(r_object.data, as: type),
    vtag: to_string(vtag),
    last_modify_time: time,
    vclock: Base.encode64(r_object.vclock)}
end
{% endhighlight %}

This next function usually should be called from a model's ***save*** function.
The save function of a kv data model is also a good place to add to the overall
count of things that model represents using a HLL datatype.  Operations such as
that and indexing can typically be done asynchronously once the primary key has
been saved.

{% highlight elixir %}
@spec creation_time(Model.t) :: integer
def creation_time(data_model) do
  case is_nil(data_model.creation_time) do
    false ->
      case is_binary(data_model.creation_time) do
        true ->
          {_, dt, _} = DateTime.from_iso8601(data_model.creation_time)
          DateTime.to_unix(dt, :microseconds)
        false -> data_model.creation_time
      end
    true -> DateTime.to_unix(DateTime.utc_now() , :microseconds)
  end
end
{% endhighlight %}

Finally I like to try to have each model implement a bunch of CRUD functions.
Callbacks for these are handy and much of the boilerplate stuff can be shoved
into a common module that they all share.  Maybe if I liked macros I would use
those in elixir, but I am not really a fan of the metaprogramming concept.
Specific model concerns such as reverse term indexing and constraint checking
can be kept in the specific KV data model modules.

Each individual kv data model should use the `@behaviour Model` which looks like
this:

{% highlight elixir %}
alias DB.Model

defmodule DB.Model do
  @type t :: module()

  # KV Mapping
  @callback bucket() :: String.t
  @callback hll_bucket() :: String.t

  # Crud
  @callback new() :: Model.t
  @callback save(Model.t) :: Model.t | :error
  @callback delete(String.t) :: :ok | :error
  @callback find(String.t | list(String.t), boolean()) :: Common.r_json_t | list(Common.r_json_t) | :not_found | :error

  @spec is_implemented?(module()) :: true | false
  def is_implemented?(module) do
    module.module_info[:attributes]
    |> Keyword.get(:behaviour, [])
    |> Enum.member?(__MODULE__)
  end
end
{% endhighlight %}

That is pretty much it.  I am sure there are missing parts here that will
prevent something from working flawlessly.  If so you can leave me some Feedback
and I'll try to correct this post.

A few things I could cover in the next post are:

1.  HAProxy configuration when using Riak
2.  Runtime maintenance of the Riak Connection Pool.
3.  Building Data Models & Namespacing Buckets
4.  Handling Errors Right
5.  Integration to Lager
6.  Cowboy 2, Gun, and Websocket Integration / Testing

Please provide feedback and let me know what you think and what you would like
to hear more on next!
