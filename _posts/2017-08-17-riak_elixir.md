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

People can do this different ways but here is what I have done.

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
one may be needed.  If anyone wants my HAProxy config just leave a comment or
email me.  I've seen some configurations disconnect clients at wrong intervals
so getting the timeouts and what not right can take some patience.

From that point on if network connectivity to the protocol buffers port in Riak
isn't a problem (when is that really ever the case) then you should be able to
just fire up iex and run:

{% highlight elixir %}
Riak.ping
{% endhighlight %}

A few things I could cover in the next post are:

1.  HAProxy configuration
2.  Runtime maintenance of the Riak Connection Pool.
3.  Building Data Models & Namespacing Buckets
4.  Handling Errors Right
5.  Integration to Lager
6.  Cowboy 2, Gun, and Websocket Integration / Testing

Please provide feedback and let me know what you think.  Feedback is how we
grow.
