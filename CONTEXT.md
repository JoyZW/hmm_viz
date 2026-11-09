# Crooked Casino HMM Explorer

A teaching tool for students meeting hidden Markov models for the first time, built on the "crooked casino": a dealer tosses a coin and occasionally, secretly, swaps a fair coin for a biased one.

## The model

**Toss**:
A single observed outcome, Heads (H) or Tails (T).
_Avoid_: Observation, emission (as a noun for the data), flip

**Toss sequence**:
The ordered tosses we actually see; the observed data.
_Avoid_: Observations, input, data string

**Coin state**:
The hidden coin in use at a toss: Fair (F) or Biased (B).
_Avoid_: Hidden state, label, regime

**Coin path**:
Any assignment of a coin state to every toss in a toss sequence. Each coin path is one row of the enumeration table and one route through the trellis.
_Avoid_: Hidden path (in UI), state sequence, q, route (as a noun in UI)

**Starting probabilities**:
The probability that the first toss uses each coin state.
_Avoid_: Initial distribution, priors, pi

**Transition probabilities**:
The probability of the coin state at one toss given the coin state at the previous toss.
_Avoid_: Switch probabilities, A matrix

**Emission probabilities**:
The probability of H or T given the coin state.
_Avoid_: Output probabilities, b, coin bias

## The three questions

**Likelihood**:
The probability of the toss sequence summed over every coin path — "how likely are the tosses?"
_Avoid_: Evidence, marginal, score

**Joint probability**:
The probability of one specific coin path together with the toss sequence.
_Avoid_: Path probability, path score

**Posterior**:
The probability the coin was Biased at toss t, given the whole toss sequence — "which coin at toss t?" The probability of Fair is its complement, not a separate posterior.
_Avoid_: Confidence, belief, smoothed probability

**Viterbi path**:
The coin path with the highest joint probability — "which sequence of coins is most likely?"
_Avoid_: Most likely path, best path, decoded path, hidden path

## Teaching artefacts

**Enumeration table**:
The table listing every coin path for a short toss sequence with its per-toss factors and joint probability; summing, filtering and maximising it answers all three questions by brute force.
_Avoid_: Output table, path table

**Trellis**:
The two-row (F/B) by n-column grid of coin states for a toss sequence: transition probabilities on the arrows, emission probabilities of the observed tosses in the nodes. It holds every coin path at once. Tracing one coin path through it gives that path's joint probability; filling its nodes with the forward, backward or Viterbi pass answers the questions without listing paths.
_Avoid_: Grid, lattice, DP table, flowchart, path diagram

## The trellis passes

**Forward pass**:
Filling the trellis left to right: each node holds the probability of the tosses so far together with that coin state at that toss, found by adding over the arrows into it. Its last column adds up to the likelihood.
_Avoid_: alpha recursion, forward algorithm (as a UI label)

**Backward pass**:
Filling the trellis right to left: each node holds the probability of the tosses still to come, given that coin state at that toss. Multiplied node by node with the forward pass and divided by the likelihood, it gives the posterior.
_Avoid_: beta recursion

**Viterbi pass**:
Filling the trellis left to right keeping only the larger arrow into each node, and remembering which one won; its last column's larger value is the Viterbi path's joint probability.
_Avoid_: max-product, Viterbi algorithm (as a UI label)

**Backpointer**:
For one node of the Viterbi pass, the coin state at the previous toss whose arrow won, written φ. It answers "where did the best path into this node come from?"
_Avoid_: ψ (the same thing in other textbooks), parent, argmax pointer

**Backtrack**:
Reading the Viterbi path off the trellis from the last toss to the first: take the coin state with the larger final value, then follow each node's backpointer one toss back.
_Avoid_: traceback, decoding

**Precision method**:
How products of many small probabilities are kept representable: Naive, Rescaled, or Log-space.
_Avoid_: Scaling option, numeric mode

**Underflow**:
A probability too small for a computer to hold: below about 10⁻³⁰⁸ it starts losing digits, and below about 10⁻³²⁴ it is stored as exactly 0. On long toss sequences the trellis values shrink by a roughly constant factor per toss, so without rescaling or logs they underflow after roughly a thousand tosses.
_Avoid_: Overflow, precision loss
