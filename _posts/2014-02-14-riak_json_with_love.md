---
layout: post
title:  "Riak JSON with Love"
date:   2014-02-14 08:00:00
type:   primary
---

Happy Valentines Day!

Next week I am presenting a talk on some of the new features within the
upcoming [Riak 2.0](/slides/riak_2_0) release as well as something 
currently called [Riak JSON](https://github.com/basho-labs/riak_json).

#### Wait, What is Riak?

<img src="/assets/images/riak_2_0/riaklogo.png" style="margin: auto; display: block;"/>

[Riak](http://docs.basho.com/riak/latest/)
is a open source distributed database which is made by the
[company](http://basho.com) I work for.  Riak has been around for a while
and there are a number of 
[great introductions](http://docs.basho.com/riak/latest/theory/why-riak/)
found all over the internet.

If you *think* you know me, you had best learn what Riak is and how to
use it if you want to continue being friends.

I kid.

#### Ok, so what is new in Riak?

Lots of things!  Riak 2.0 comes with better search capability, new built
in distributed data types, options for stronger consistency, and improved
configuration management for deployments in the cloud.

Of all the features, I am most excited about both Search 2.0 and the new
built in
[Conflict-free replicated data types](http://hal.upmc.fr/docs/00/55/55/88/PDF/techreport.pdf)
otherwise known as `CRDT`.  These are
[already documented](http://docs.basho.com/riak/2.0.0pre11/dev/using/data-types/),
and I may write about these later.

#### Great, so what is Riak JSON?

[Riak JSON](https://github.com/basho-labs/riak_json)
is a open source document query interface which is built on top of Riak 2.0
that uses [Solr](https://lucene.apache.org/solr) to index document data.

Riak JSON focuses on [JSON](http://json.org) documents.  Why JSON? Because
(lets be honest here) it is *currently* gaining in popularity and people
want to use it.  JSON is now popping up all the time for me, and I want
better tooling to help my work be more efficient (while still being correct)
while working with distributed databases.

Are you not like me and have a specific serialized format you actually care
about?  Riak JSON will show you how to build out such a specific interface
on top of Riak, or you can use the lower level Solr / Yokozuna API directly
which is underneath Riak JSON.  This is also something we (at Basho) can help
you with.

#### Diving In

Ok, so to get started with Riak JSON we start off with the branch of Riak
that has everything put together.  If need a pre-built package please yell at
me (nicely) on twitter and I *may* accomodate you.  Riak JSON will work on
any Riak 2.0 install.

Note, the content below is the same material [within the the slides](/slides/riak_2_0)
prepared for the talk.

Building from source:

{% highlight bash %}
git clone https://github.com/basho/riak.git
git checkout ack-riak-json
make rel
make devrel
{% endhighlight %}

Enable both search and riak json within the `etc/riak.conf` file.

{% highlight bash %}
search = on
riak_json_http = on
{% endhighlight %}

Fire up Riak

{% highlight bash %}
ulimit -n 4096
bin/riak start
bin/riak ping
{% endhighlight %}

The Java client has the following dependencies to deal with the HTTP,
serialization to JSON, and logging concerns:

* Apache HTTP Client
* Jackson
* SLF4J

Using the Java / Scala library:

```scala
import com.basho.riak.json._
import com.basho.riak.json.Field.Type._

import scala.beans.BeanProperty
import com.fasterxml.jackson.annotation.JsonIgnore;

val client = new Client("localhost", 10018)
val collection = client.createCollection("squares")
```

Define a document class:

```scala
class MySquare (l:Int, w:Int) extends Document {
  def this() =  this(0, 0)
  @BeanProperty var key: String = _
  @BeanProperty var length: Int = l
  @BeanProperty var width: Int = w

  /* don't serialize this tuple */
  @JsonIgnore def getSize = Tuple2(length, width)
}
```

Define a schema:

```scala
val schema = new Schema.Builder()
  .addField(new Field("length", INTEGER).setRequired(true))
  .addField(new Field("width", INTEGER).setRequired(true))
  .addField(new Field("owner", STRING))
  .build()

collection.setSchema(schema);
```

Add some data, riak will generate the keys for you if you wish, or you
may assign your own.

```scala
val large_square = new MySquare(1024, 768)
val normal_square = new MySquare(640, 480)
collection.insert(large_square)
collection.insert(normal_square)
```

Query by key:

```scala
val result = collection.findByKey("9tT49FHJoQImObmPYgVPRcB56T2", classOf[MySquare])
result.getLength() => 1024
```

Search!  Find One Thing:

```scala
val q_string = "{\"length\": {\"$gt\": 300}}"
val query = new Query(q_string, classOf[MySquare]);
val single_result = collection.findOne(query)
```

Find ALL the things!

```scala
val many_results = collection.findAll(query)

// documents are a java Collection
many_results.getDocuments().size() => 2

// info about the result set
many_results.numPages(); => 1 -- total pages in result set
many_results.getPage(); => 0 -- current page (zero-indexed)
many_results.perPage(); => results per page, defaults to 100

// extract into a more malable scala list if needed:
many_results.getDocuments.toArray(
  new Array[MySquare](many_results.getDocuments.size)
)
```

Requery with: `"$per_page":10` and `"$page":1` to control the pagination
set.

Lastly, you can query Riak using a few different approaches:

KV Style:

```bash
'http://localhost:10018/types/squaresRJType/buckets/squares/keys/<key>'
```

Riak Search 2.0 (Solr / Yokozuna) Style:

```bash
'http://localhost:10018/search/squaresRJIndex?q=length:[640%20TO%20*]&wt=json'
```

And finally cleanup:

```scala
collection.remove(large_square)
collection.remove(normal_square)
collection.deleteSchema()
```

#### Conclusion

A key interest of mine is making Riak more developer friendly, and while
there will continue to be gaps as we iterate, I feel that the 2.0 is a *step*
in the right direction to achieve this.

<img src="/assets/images/riak_2_0/basho-logo.png" style="margin: auto; display: block;"/>




