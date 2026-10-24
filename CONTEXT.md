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
Any assignment of a coin state to every toss in a toss sequence.
_Avoid_: Hidden path (in UI), state sequence, q

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
The probability the coin was Biased at toss t, given the whole toss sequence — "which coin at toss t?"
_Avoid_: Confidence, belief, smoothed probability

**Viterbi path**:
The coin path with the highest joint probability — "which sequence of coins is most likely?"
_Avoid_: Most likely path, best path, decoded path, hidden path

## Teaching artefacts

**Enumeration table**:
The table listing every coin path for a short toss sequence with its per-toss factors and joint probability; summing, filtering and maximising it answers all three questions by brute force.
_Avoid_: Output table, path table

**Trellis**:
The two-row (F/B) by n-column grid of the Viterbi or forward recursion, with arrows between consecutive columns.
_Avoid_: Grid, lattice, DP table

**Precision method**:
How products of many small probabilities are kept representable: Naive, Rescaled, or Log-space.
_Avoid_: Scaling option, numeric mode

**Underflow**:
A probability too small for a double (below ~1e-308) collapsing to exactly 0.
_Avoid_: Overflow, precision loss
