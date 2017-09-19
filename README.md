# mongowatcher

This is my first attempt at writing a node.js
from 2014. I started with the express framework
but really did not use the default setup to 
to communicate with a browser (although I 
could have done so if anyone wanted to use 
this microservice).

The idea was simple.

Text documents are created from templates in a mongodb.

The mongodb is sharded and replicated, and as the
text documents get to a ready to dispatch state, they
go through several states, and we can monitor the
process by watching the oplog. If text document generation
and dispatch went wrong, we could watch text documents
increase in an intermediate state.

Because the mongowatcher did not have a user 
interface, I just created a collection in the
mongodb which kept track of all the "bucket"
information. Another program could analyze this collection
to detect problems.

The buckets tracked the number of text documents in
a given state. Note that a text document is not
a mongo document. A mongo database contains 
many collections of documents, and we are
generating text documents from templates for dispatch.

See [Mongodb Manual](https://docs.mongodb.com/v3.2/core/databases-and-collections/) for
a discussion of mongodb structure.
