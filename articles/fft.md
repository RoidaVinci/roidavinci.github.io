---
layout: default
title: "Fast Fourier Transform for Convolutions"
---

## Computational Cost and FFT

A convolution with \( F \) filters of size \( r \) requires, for each of the \( \prod_{j=1}^D d_j \) output pixels, a total of \( \prod_{j=1}^D r_j \) multiplications and \( \prod_{j=1}^D r_j - 1 \) additions if performed intuitively according to the definition. This adds to a complexity order of \( \mathcal{O}\left(F \cdot \prod_{j=1}^D d_j \cdot \prod_{j=1}^D r_j\right) \), which scales exponentially with the dimension. Although not prohibitive in many cases given the small dimensions of the most commonly used convolutional filters, it significantly hampers its execution. Therefore, different techniques are used in practice to significantly reduce this computational burden. This work will describe the multidimensional discrete Fourier transform \cite{duhamel-fft} and detail the procedure for calculating convolutions using the convolution theorem. Some more recent works point to the existence of more advanced algorithms that surpass this efficiency for very small filters \cite{lavin2015fast}, but their content is beyond the scope of this work.

### Definition: Multidimensional Discrete Fourier Transform
\footnote{There are techniques to reduce the multidimensional discrete Fourier transform to discrete Fourier transforms, such as the row-column algorithm [find reference]. In fact, this approach is commonly used in practical implementations.}
Given an image \( x \in \mathbb{C}^d \), its discrete Fourier transform is defined as:

$$
\mathcal{F}(x) = \left( \sum_{n \in [1,d]} e^{-i2\pi\frac{n}{d} k} x_n \right)_{k \in [1,d]} = \left( \sum_{n \in [1,d]} \left( \prod_{j=1}^D \omega_{d_j}^{n_j k_j} \right) x_n \right)_{k \in [1,d]} \in \mathbb{C}^d.
$$

### Proposition: Inverse Fourier Transform
The Fourier transform has an inverse given by:

$$
\mathcal{F}^{-1}(Y) = \frac{1}{\prod_{j=1}^D d_j} \left( \sum_{n \in [1,d]} e^{-i2\pi \frac{n \odot k}{d}} Y_k \right)_{n \in [1,d]}^N \in \mathbb{C}^d.
$$

Given \( Y \in \mathbb{C}^q \), \( \widehat{Y} \in (\mathbb{C}^{\mathbb{Z}})^D \) is defined as the infinite image associated with \( Y \), with \( \widehat{Y}[1,q] = Y \) and \( Y_i = 0 \) if \( i \not\in [1,q] \).

### Theorem: Convolution Theorem
Given \( X \in (\mathbb{C}^{\mathbb{Z}})^D \) and \( F \in (\mathbb{C}^{\mathbb{Z}})^D \), we have:

$$
\widehat{Y} \ast \widehat{X} = \mathcal{F}^{-1}(\mathcal{F}(\widehat{Y}^*) \odot \mathcal{F}(\widehat{X})).
$$

### Corollary: Inverse Convolution

Let \( Z = Y \ast X \). Then:

$$
\mathcal{F}(Z) = \mathcal{F}(X) \odot \mathcal{F}(Y^*).
$$

In particular, for one-dimensional transforms:

$$
X = \mathcal{F}^{-1}\left( \left( \frac{\mathcal{F}(Z)}{\mathcal{F}(Y^*)} \right) \right).
$$

Therefore, given that:

$$
F \ast_{(d,r,s,p)} X = (\widehat{F} \ast \widehat{X}) \left[ s \odot [r - p, d - r + p] \right],
$$

we have \( X = \mathcal{F}^{-1}\left( \left( \frac{\mathcal{F}(F \ast_{(d,r,s,p)} X)}{\mathcal{F}(F^*)} \right) \right) \).

Note that computing each component of the discrete Fourier transform requires approximately \( D \cdot \left( \prod_{j=1}^D d_j \right) \) multiplications and \( \prod_{j=1}^D d_j - 1 \) additions, resulting in a total complexity of \( \mathcal{O}\left( \prod_{j=1}^D d_j^2 \right) \). This scales extremely rapidly with the image size, being exponential in \( D \), making higher-order tensor transforms computationally expensive.

An algorithm is said to be a **fast Fourier transform (FFT)** if it achieves a complexity order of \( \mathcal{O}(d \log(d)) \)\footnote{The first algorithms of this type were proposed in the 1960s by Cooley and Tukey \cite{FFT-CooleyTukey}, whose approach of dividing the transform problem into subproblems that regroup information is still used by most such algorithms today. There is no proof that this is the optimal complexity.} in dimension \( d \). We will present a family of algorithms known as **vector-radix** \cite{duhamel-fft}. The central idea is to decompose the large Fourier transform into a large number of small Fourier transforms, significantly reducing complexity. Based on the decomposition \( R_i | d_i \), \( n = p + q \odot \frac{d}{R} \), and \( k = v + R \odot u \) with \( u, p \in \left[0, \frac{d}{R} - 1\right] \) and \( v, q \in [0, R - 1] \):

$$
\mathcal{F}(x)_{v + R \odot u} = \sum_{n \in [1,d]} x_n e^{\sum_{j=1}^D -2\pi i \frac{k_j n_j}{d_j}} = \sum_{p \in \left[0, \frac{d}{R} - 1\right]} \left( \left( \sum_{q \in [0, R - 1]} x_{p + q \odot \frac{d}{R}} \prod_{j=1}^D \omega_{R_i}^{q_i v_i} \right) \prod_{j=1}^D \omega_{d_i}^{p_i v_i} \omega_{d_i/R_i}^{p_i u_i} \right),
$$

so that if \( Y_{p,v} = \sum_{q \in [0, R - 1]} x_{p + q \odot \frac{d}{R}} \prod_{j=1}^D \omega_{R_i}^{q_i v_i} \) then:

$$
\mathcal{F}(x)_{v + R \odot u} = \sum_{p \in [0, d/R - 1]} Y_{p,v} \prod_{j=1}^D \omega_{d_i}^{p_i v_i} \omega_{d_i/R_i}^{p_i u_i} = \sum_{p \in [0, d/R - 1]} Y'_{p,v} \prod_{j=1}^D \omega_{d_i/R_i}^{p_i u_i} = \mathcal{F}(Y[\cdot,v])_{u}.
$$

This decomposition allows transforming a Fourier transform of an image of dimension \( d \) into \( \pw{N}{1} = \prod_{j=1}^D R_j \) Fourier transforms of dimension \( \frac{d}{R} \), with the cost of transforming the calculation of \( Y_{p,v} \), which are \( D \prod_{j=1}^D R_j \) multiplications and \( \prod_{j=1}^D R_j \) additions. Then, calling \( \pw{R}{1} = R \) and reiterating this decomposition procedure through successive divisors \( \pw{R}{k} | \frac{d}{\pw{R}{k - 1}} \), obtaining in each iteration the problem of performing \( \pw{N}{k} = \pw{N}{k - 1} \prod_{j=1}^D \pw{R}{k}_j \) Fourier transforms of dimension \( \prod_{j=1}^D \frac{d_j}{\prod_{t=1}^k \pw{R}{t}} \), the computational complexity in iteration \( k \) is:

$$
C_k = \pw{N}{k} \prod_{j=1}^D \frac{d_j}{\prod_{t=1}^k \pw{R}{t}_j} \left( \frac{d_j}{\prod_{t=1}^k \pw{R}{tj} \right) - 1 \right) + \sum_{t=1}^k (D + 1) \pw{N}{k - 1} \prod_{j=1}^D \pw{R}{t}_j,
$$

where the first term accounts for the computational complexity of performing the Fourier transform, and the second for the transformations. Note that \( \pw{N}{final} = \prod_{j=1}^D d_j \) and \( d_j = \prod_{t=1}^k \pw{R}{t}_j \), so:

$$
C_{final} = \prod_{j=1}^D d_j + (D + 1) \sum_{t=1}^{final} \pw{N}{t}.
$$

If the \( d_j \) are highly factorable numbers, i.e., whose prime factorization can be done in very small primes, then the above complexity reduces further, reaching the optimal value when all \( d_j \) are the same power of 2. For example, if \( d_j = (2^n)_{j=1}^D \), the algorithm achieves a complexity of \( 2^{nD} + (D + 1)n 2^{nD} \in \mathcal{O}(nD 2^{nD}) = \mathcal{O}(k \log(k)) \) where \( k = 2^{nD} \) is the number of pixels in the image. For a clearer idea of the significant improvement this entails, note that for something as simple as computing the Fourier transform of a \( 2048 \times 2048 \) black-and-white image, the necessary operations are reduced from \( 1.7 \cdot 10^{13} \) to \( 2.7 \cdot 10^7 \), making execution approximately 630,000 times faster.

The same idea can be exactly applied to the calculation of the inverse Fourier transform, so the above forms the indispensable basis for efficiently applying convolutions on a computer, and thus is indispensable for the applicability of large deep neural networks with thousands of filters applied to millions of images.
